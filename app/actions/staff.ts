'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { staffSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export interface StaffActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: { [key: string]: string[] };
}

export async function createStaffAction(
  _prevState: StaffActionResponse | null,
  formData: FormData
): Promise<StaffActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Administrator access required.' };
  }

  const rawData = {
    staffCode: formData.get('staffCode')?.toString().trim() || '',
    fullName: formData.get('fullName')?.toString().trim() || '',
    phone: formData.get('phone')?.toString().trim() || '',
    email: formData.get('email')?.toString().trim() || '',
    designation: formData.get('designation')?.toString() as any,
    joiningDate: formData.get('joiningDate')?.toString().trim() || '',
    monthlyTargetPoints: formData.get('monthlyTargetPoints') ? Number(formData.get('monthlyTargetPoints')) : 150,
    isActive: formData.get('isActive') === 'true' || formData.get('isActive') === 'on',
    notes: formData.get('notes')?.toString().trim() || '',
    createLoginAccount: formData.get('createLoginAccount') === 'true' || formData.get('createLoginAccount') === 'on',
    loginPassword: formData.get('loginPassword')?.toString() || undefined,
  };

  const validation = staffSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please correct the validation errors.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    // Check if staff code or email already exists
    const existingCheck = await query(
      'SELECT id, staff_code, email FROM staff WHERE staff_code = $1 OR LOWER(email) = LOWER($2);',
      [data.staffCode, data.email]
    );

    if (existingCheck.rows.length > 0) {
      const match = existingCheck.rows[0];
      if (match.staff_code.toLowerCase() === data.staffCode.toLowerCase()) {
        return { success: false, error: `Staff Code "${data.staffCode}" is already in use.` };
      }
      return { success: false, error: `Email address "${data.email}" is already registered.` };
    }

    await withTransaction(async (client) => {
      let createdUserId: string | null = null;

      if (data.createLoginAccount && data.loginPassword) {
        const passwordHash = await hashPassword(data.loginPassword);
        const userRes = await client.query(
          `
          INSERT INTO users (email, password_hash, role, is_active)
          VALUES ($1, $2, 'staff', $3)
          RETURNING id;
          `,
          [data.email, passwordHash, data.isActive]
        );
        createdUserId = userRes.rows[0].id;
      }

      const staffRes = await client.query(
        `
        INSERT INTO staff (
          user_id, staff_code, full_name, phone, email,
          designation, joining_date, monthly_target_points, is_active, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
        `,
        [
          createdUserId,
          data.staffCode,
          data.fullName,
          data.phone,
          data.email,
          data.designation,
          data.joiningDate,
          data.monthlyTargetPoints,
          data.isActive,
          data.notes || null,
        ]
      );

      const staffId = staffRes.rows[0].id;

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: 'STAFF_CREATED',
        entityType: 'staff',
        entityId: staffId,
        reason: `Created staff member ${data.fullName} (${data.staffCode})`,
        afterValues: data,
      });
    });

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    console.error('[Create Staff Error]:', err);
    return { success: false, error: 'Database error: ' + err.message };
  }
}

export async function updateStaffAction(
  _prevState: StaffActionResponse | null,
  formData: FormData
): Promise<StaffActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Administrator access required.' };
  }

  const staffId = formData.get('staffId')?.toString();
  if (!staffId) {
    return { success: false, error: 'Missing staff ID.' };
  }

  const rawData = {
    staffCode: formData.get('staffCode')?.toString().trim() || '',
    fullName: formData.get('fullName')?.toString().trim() || '',
    phone: formData.get('phone')?.toString().trim() || '',
    email: formData.get('email')?.toString().trim() || '',
    designation: formData.get('designation')?.toString() as any,
    joiningDate: formData.get('joiningDate')?.toString().trim() || '',
    monthlyTargetPoints: formData.get('monthlyTargetPoints') ? Number(formData.get('monthlyTargetPoints')) : 150,
    isActive: formData.get('isActive') === 'true' || formData.get('isActive') === 'on',
    notes: formData.get('notes')?.toString().trim() || '',
  };

  const validation = staffSchema.omit({ createLoginAccount: true, loginPassword: true }).safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please fix validation errors.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    const existing = await query('SELECT * FROM staff WHERE id = $1;', [staffId]);
    if (existing.rows.length === 0) {
      return { success: false, error: 'Staff member not found.' };
    }
    const beforeValues = existing.rows[0];

    await withTransaction(async (client) => {
      await client.query(
        `
        UPDATE staff
        SET 
          staff_code = $1,
          full_name = $2,
          phone = $3,
          email = $4,
          designation = $5,
          joining_date = $6,
          monthly_target_points = $7,
          is_active = $8,
          notes = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10;
        `,
        [
          data.staffCode,
          data.fullName,
          data.phone,
          data.email,
          data.designation,
          data.joiningDate,
          data.monthlyTargetPoints,
          data.isActive,
          data.notes || null,
          staffId,
        ]
      );

      // Also update linked user's active status and email if exists
      if (beforeValues.user_id) {
        await client.query(
          `
          UPDATE users
          SET email = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3;
          `,
          [data.email, data.isActive, beforeValues.user_id]
        );
      }

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: 'STAFF_UPDATED',
        entityType: 'staff',
        entityId: staffId,
        reason: `Updated details for ${data.fullName}`,
        beforeValues,
        afterValues: data,
      });
    });

    revalidatePath('/staff');
    revalidatePath(`/staff/${staffId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Update Staff Error]:', err);
    return { success: false, error: 'Failed to update staff: ' + err.message };
  }
}

export async function toggleStaffStatusAction(
  staffId: string,
  newActiveState: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const res = await query('SELECT user_id, full_name FROM staff WHERE id = $1;', [staffId]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Staff not found.' };
    }
    const { user_id, full_name } = res.rows[0];

    await withTransaction(async (client) => {
      await client.query('UPDATE staff SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [
        newActiveState,
        staffId,
      ]);

      if (user_id) {
        await client.query('UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [
          newActiveState,
          user_id,
        ]);
      }

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: newActiveState ? 'STAFF_UPDATED' : 'STAFF_DEACTIVATED',
        entityType: 'staff',
        entityId: staffId,
        reason: `${newActiveState ? 'Activated' : 'Deactivated'} staff member ${full_name}`,
      });
    });

    revalidatePath('/staff');
    revalidatePath(`/staff/${staffId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin action to set or update target points for a staff member for a specific month
 */
export async function setStaffMonthlyTargetAction(
  staffId: string,
  targetPoints: number,
  year?: number,
  month?: number,
  notes?: string,
  updateDefault: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Administrator access required.' };
  }

  if (targetPoints < 0 || isNaN(targetPoints)) {
    return { success: false, error: 'Target points must be a positive number.' };
  }

  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  try {
    await withTransaction(async (client) => {
      // 1. Upsert specific month's target in staff_monthly_targets
      await client.query(
        `
        INSERT INTO staff_monthly_targets (staff_id, year, month, target_points, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (staff_id, year, month)
        DO UPDATE SET target_points = EXCLUDED.target_points, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP;
        `,
        [staffId, targetYear, targetMonth, targetPoints, notes || null]
      );

      // 2. Optionally update baseline default target if requested
      if (updateDefault) {
        await client.query(
          'UPDATE staff SET monthly_target_points = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;',
          [targetPoints, staffId]
        );
      }

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: 'STAFF_UPDATED',
        entityType: 'staff',
        entityId: staffId,
        reason: `Admin updated target points to ${targetPoints} for ${targetMonth}/${targetYear}${updateDefault ? ' (and set as default)' : ''}`,
      });
    });

    revalidatePath('/dashboard');
    revalidatePath('/staff');
    revalidatePath(`/staff/${staffId}`);
    revalidatePath('/reports');
    return { success: true };
  } catch (err: any) {
    console.error('[Set Staff Target Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch a staff member's target points for a specific month/year
 */
export async function getStaffMonthlyTargetAction(
  staffId: string,
  year: number,
  month: number
): Promise<{ success: boolean; targetPoints: number; notes?: string }> {
  try {
    const res = await query(
      `
      SELECT 
        COALESCE(smt.target_points, s.monthly_target_points, 150.00)::numeric AS target_points,
        smt.notes
      FROM staff s
      LEFT JOIN staff_monthly_targets smt ON smt.staff_id = s.id 
        AND smt.year = $2 AND smt.month = $3
      WHERE s.id = $1;
      `,
      [staffId, year, month]
    );

    if (res.rows.length === 0) {
      return { success: false, targetPoints: 150 };
    }

    return {
      success: true,
      targetPoints: parseFloat(res.rows[0].target_points || '150'),
      notes: res.rows[0].notes || '',
    };
  } catch (err: any) {
    return { success: false, targetPoints: 150 };
  }
}


