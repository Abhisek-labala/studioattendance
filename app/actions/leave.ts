'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { leaveRequestSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';
import { createNotification, notifyAdmins } from '@/lib/notifications/notify';

export interface LeaveActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: { [key: string]: string[] };
}

export async function requestLeaveAction(
  _prevState: LeaveActionResponse | null,
  formData: FormData
): Promise<LeaveActionResponse> {
  const session = await getSession();
  if (!session) return { success: false, error: 'Unauthorized.' };

  const targetStaffId = session.role === 'admin'
    ? (formData.get('staffId')?.toString() || session.staffId)
    : session.staffId;

  if (!targetStaffId) return { success: false, error: 'Staff ID could not be determined.' };

  const rawData = {
    staffId: targetStaffId,
    leaveType: formData.get('leaveType')?.toString() as any,
    startDate: formData.get('startDate')?.toString().trim() || '',
    endDate: formData.get('endDate')?.toString().trim() || '',
    reason: formData.get('reason')?.toString().trim() || '',
  };

  const validation = leaveRequestSchema.safeParse(rawData);
  if (!validation.success) {
    const firstErrorMessage = validation.error.issues[0]?.message || 'Please correct the form errors.';
    return {
      success: false,
      error: firstErrorMessage,
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    // Overlapping leave validation: check if staff already has a Pending or Approved leave overlapping this date range
    const overlapRes = await query(
      `
      SELECT id, leave_type, start_date::text, end_date::text, status
      FROM leave_requests
      WHERE staff_id = $1
        AND status IN ('Pending', 'Approved')
        AND start_date <= $3
        AND end_date >= $2
      LIMIT 1;
      `,
      [data.staffId, data.startDate, data.endDate]
    );

    if (overlapRes.rows.length > 0) {
      const existing = overlapRes.rows[0];
      return {
        success: false,
        error: `An active ${existing.status.toLowerCase()} ${existing.leave_type} already exists for overlapping dates (${existing.start_date} to ${existing.end_date}). Duplicate leave requests for the same date are not allowed.`,
      };
    }

    await query(
      `
      INSERT INTO leave_requests (staff_id, leave_type, start_date, end_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'Pending');
      `,
      [data.staffId, data.leaveType, data.startDate, data.endDate, data.reason]
    );

    await notifyAdmins(
      'Leave Request Submitted',
      `${session.fullName || session.email} submitted a ${data.leaveType} request from ${data.startDate} to ${data.endDate}.`,
      'SYSTEM',
      '/leave'
    );

    revalidatePath('/leave');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function reviewLeaveRequestAction(
  leaveId: string,
  decision: 'Approved' | 'Rejected',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { success: false, error: 'Unauthorized.' };

  try {
    const leaveRes = await query(
      `
      SELECT lr.*, s.full_name, s.user_id AS staff_user_id, s.id AS staff_id
      FROM leave_requests lr
      JOIN staff s ON s.id = lr.staff_id
      WHERE lr.id = $1;
      `,
      [leaveId]
    );

    if (leaveRes.rows.length === 0) return { success: false, error: 'Leave request not found.' };
    const leave = leaveRes.rows[0];

    await withTransaction(async (client) => {
      await client.query(
        `
        UPDATE leave_requests
        SET 
          status = $1,
          rejection_reason = $2,
          reviewed_by = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4;
        `,
        [decision, decision === 'Rejected' ? rejectionReason : null, session.userId, leaveId]
      );

      // If approved, create attendance records for the leave dates
      if (decision === 'Approved') {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const current = new Date(start);

        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];

          // Only insert if no attendance record exists for the day
          await client.query(
            `
            INSERT INTO attendance (staff_id, date, status, is_approved, approved_by, approved_at)
            VALUES ($1, $2, 'Leave', true, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (staff_id, date) DO NOTHING;
            `,
            [leave.staff_id, dateStr, session.userId]
          );

          current.setDate(current.getDate() + 1);
        }
      }

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: decision === 'Approved' ? 'LEAVE_APPROVAL' : 'LEAVE_REJECTION',
        entityType: 'leave_request',
        entityId: leaveId,
        reason: decision === 'Approved'
          ? `Leave approved for ${leave.full_name}`
          : `Leave rejected: ${rejectionReason}`,
      });

      // Notify staff member
      if (leave.staff_user_id) {
        await createNotification({
          userId: leave.staff_user_id,
          title: `Leave Request ${decision}`,
          message: decision === 'Approved'
            ? `Your ${leave.leave_type} from ${leave.start_date} to ${leave.end_date} was approved.`
            : `Your leave request was rejected. Reason: ${rejectionReason || 'No reason provided.'}`,
          type: decision === 'Approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
          link: '/leave',
        });
      }
    });

    revalidatePath('/leave');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cancelLeaveRequestAction(
  leaveId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: 'Unauthorized.' };

  try {
    const leaveRes = await query(
      'SELECT staff_id, status FROM leave_requests WHERE id = $1;',
      [leaveId]
    );
    if (leaveRes.rows.length === 0) return { success: false, error: 'Leave request not found.' };

    const leave = leaveRes.rows[0];

    // Non-admins can only cancel their own leave requests
    if (session.role !== 'admin' && leave.staff_id !== session.staffId) {
      return { success: false, error: 'You can only cancel your own leave requests.' };
    }

    // Only Pending leaves can be cancelled by staff
    if (session.role !== 'admin' && leave.status !== 'Pending') {
      return { success: false, error: 'Only pending leave requests can be withdrawn.' };
    }

    await query('DELETE FROM leave_requests WHERE id = $1;', [leaveId]);

    revalidatePath('/leave');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


