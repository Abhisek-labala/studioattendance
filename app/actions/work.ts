'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { workEntrySchema } from '@/lib/validation/schemas';
import { calculateWorkPoints } from '@/lib/points/engine';
import { logAuditEvent } from '@/lib/audit/logger';
import { createNotification, notifyAdmins } from '@/lib/notifications/notify';

export interface WorkActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: { [key: string]: string[] };
}

/**
 * Submit a new work entry with server-side point verification
 */
export async function submitWorkEntryAction(
  _prevState: WorkActionResponse | null,
  formData: FormData
): Promise<WorkActionResponse> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  const requestedStaffId = formData.get('staffId')?.toString();
  // Role security: Staff can only submit work entries for themselves!
  const targetStaffId = session.role === 'admin' ? requestedStaffId || session.staffId : session.staffId;

  if (!targetStaffId) {
    return { success: false, error: 'Valid staff identity could not be verified.' };
  }

  const rawData = {
    workDate: formData.get('workDate')?.toString().trim() || new Date().toISOString().split('T')[0],
    staffId: targetStaffId,
    projectId: formData.get('projectId')?.toString() || null,
    workType: formData.get('workType')?.toString() as any,
    quantityOrDuration: parseFloat(formData.get('quantityOrDuration')?.toString() || '1'),
    isLateNight: formData.get('isLateNight') === 'true' || formData.get('isLateNight') === 'on',
    isOutOfStation: formData.get('isOutOfStation') === 'true' || formData.get('isOutOfStation') === 'on',
    isRework: formData.get('isRework') === 'true' || formData.get('isRework') === 'on',
    remarks: formData.get('remarks')?.toString().trim() || null,
    idempotencyKey: formData.get('idempotencyKey')?.toString().trim() || null,
  };

  const validation = workEntrySchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please fix validation errors in the work form.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // 1. Fetch active configured rule from point_rules table for this workType
  let dynamicRule: any = null;
  try {
    const ruleRes = await query(
      `SELECT * FROM point_rules WHERE LOWER(work_type) = LOWER($1) AND is_active = true ORDER BY created_at DESC LIMIT 1;`,
      [data.workType]
    );
    if (ruleRes.rows.length > 0) {
      dynamicRule = ruleRes.rows[0];
    }
  } catch (err) {
    // fallback to defaults
  }

  // Centralized Server-Side Calculation: Never trust points submitted by the browser!
  const calculation = calculateWorkPoints({
    workType: data.workType,
    quantityOrDuration: data.quantityOrDuration,
    isLateNight: data.isLateNight,
    isOutOfStation: data.isOutOfStation,
    isRework: data.isRework,
  }, dynamicRule);

  try {
    // Check idempotency key to prevent double submissions from repeated clicks
    if (data.idempotencyKey) {
      const existing = await query('SELECT id FROM work_entries WHERE idempotency_key = $1;', [
        data.idempotencyKey,
      ]);
      if (existing.rows.length > 0) {
        return { success: true }; // already recorded safely
      }
    }

    const initialStatus = session.role === 'admin' ? 'Approved' : 'Submitted';

    await withTransaction(async (client) => {
      const insertRes = await client.query(
        `
        INSERT INTO work_entries (
          work_date, staff_id, project_id, work_type,
          quantity_or_duration, is_late_night, is_out_of_station, is_rework,
          base_points, bonus_points, total_points, rule_version,
          calculation_snapshot, remarks, status, submitted_at,
          reviewed_by, reviewed_at, idempotency_key
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, CURRENT_TIMESTAMP,
          $16, $17, $18
        )
        RETURNING id;
        `,
        [
          data.workDate,
          data.staffId,
          data.projectId || null,
          data.workType,
          data.quantityOrDuration,
          data.isLateNight,
          data.isOutOfStation,
          data.isRework,
          calculation.basePoints,
          calculation.bonusPoints,
          calculation.totalPoints,
          calculation.ruleVersion,
          JSON.stringify(calculation.calculationSnapshot),
          data.remarks || null,
          initialStatus,
          session.role === 'admin' ? session.userId : null,
          session.role === 'admin' ? new Date() : null,
          data.idempotencyKey || null,
        ]
      );

      const entryId = insertRes.rows[0].id;

      // Notify admins if submitted by staff
      if (session.role !== 'admin') {
        await notifyAdmins(
          'New Work Entry Submitted',
          `${session.fullName || session.email} submitted ${data.workType} (${calculation.totalPoints} pts) for approval.`,
          'WORK_SUBMITTED',
          '/work-register'
        );
      }
    });

    revalidatePath('/work-register');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('[Submit Work Error]:', err);
    return { success: false, error: 'Database error: ' + err.message };
  }
}

/**
 * Admin workflow: Approve or Reject a submitted work entry
 */
export async function reviewWorkEntryAction(
  workEntryId: string,
  decision: 'Approved' | 'Rejected',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Administrator access required.' };
  }

  if (decision === 'Rejected' && (!rejectionReason || rejectionReason.trim().length < 3)) {
    return { success: false, error: 'A valid rejection reason is required.' };
  }

  try {
    const entryRes = await query(
      `
      SELECT w.*, s.full_name as staff_name, s.user_id as staff_user_id
      FROM work_entries w
      JOIN staff s ON s.id = w.staff_id
      WHERE w.id = $1;
      `,
      [workEntryId]
    );

    if (entryRes.rows.length === 0) {
      return { success: false, error: 'Work entry not found.' };
    }

    const entry = entryRes.rows[0];

    await withTransaction(async (client) => {
      await client.query(
        `
        UPDATE work_entries
        SET 
          status = $1,
          rejection_reason = $2,
          reviewed_by = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4;
        `,
        [decision, decision === 'Rejected' ? rejectionReason : null, session.userId, workEntryId]
      );

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: decision === 'Approved' ? 'WORK_APPROVAL' : 'WORK_REJECTION',
        entityType: 'work_entry',
        entityId: workEntryId,
        reason: decision === 'Approved' ? `Approved ${entry.total_points} points` : `Rejected: ${rejectionReason}`,
        beforeValues: { status: entry.status, total_points: entry.total_points },
        afterValues: { status: decision, rejection_reason: rejectionReason },
      });

      // Notify the staff member
      if (entry.staff_user_id) {
        await createNotification({
          userId: entry.staff_user_id,
          title: `Work Entry ${decision}`,
          message:
            decision === 'Approved'
              ? `Your work entry for ${entry.work_type} (${entry.total_points} pts) was approved!`
              : `Your work entry for ${entry.work_type} was rejected. Reason: ${rejectionReason}`,
          type: decision === 'Approved' ? 'WORK_APPROVED' : 'WORK_REJECTED',
          link: '/work-register',
        });
      }
    });

    revalidatePath('/work-register');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin correction for an already approved work entry (strictly audited)
 */
export async function correctApprovedWorkEntryAction(
  workEntryId: string,
  newPoints: number,
  adminReason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin access required.' };
  }

  if (!adminReason || adminReason.trim().length < 5) {
    return { success: false, error: 'A detailed reason is required for audited corrections.' };
  }

  try {
    const entryRes = await query('SELECT * FROM work_entries WHERE id = $1;', [workEntryId]);
    if (entryRes.rows.length === 0) {
      return { success: false, error: 'Work entry not found.' };
    }
    const beforeValues = entryRes.rows[0];

    await withTransaction(async (client) => {
      await client.query(
        `
        UPDATE work_entries
        SET 
          total_points = $1,
          remarks = COALESCE(remarks, '') || ' [Admin Correction: ' || $2 || ']',
          reviewed_by = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4;
        `,
        [newPoints, adminReason, session.userId, workEntryId]
      );

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: 'POINT_ADJUSTMENT',
        entityType: 'work_entry',
        entityId: workEntryId,
        reason: adminReason,
        beforeValues: { total_points: beforeValues.total_points },
        afterValues: { total_points: newPoints, reason: adminReason },
      });
    });

    revalidatePath('/work-register');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

