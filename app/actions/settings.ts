'use server';

import { revalidatePath } from 'next/cache';
import { query } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { studioSettingsSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export async function updateStudioSettingsAction(
  _prevState: any,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin access required.' };
  }

  const rawData = {
    studioName: formData.get('studioName')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    address: formData.get('address')?.toString() || '',
    workingHoursPerDay: formData.get('workingHoursPerDay')?.toString() || '8',
    lateGracePeriodMinutes: formData.get('lateGracePeriodMinutes')?.toString() || '15',
    halfDayMinimumMinutes: formData.get('halfDayMinimumMinutes')?.toString() || '240',
    fullDayMinimumMinutes: formData.get('fullDayMinimumMinutes')?.toString() || '480',
    overtimeThresholdMinutes: formData.get('overtimeThresholdMinutes')?.toString() || '510',
    requireWorkApproval: formData.get('requireWorkApproval') === 'true' || formData.get('requireWorkApproval') === 'on',
    requireAttendanceApproval: formData.get('requireAttendanceApproval') === 'true' || formData.get('requireAttendanceApproval') === 'on',
  };

  const validation = studioSettingsSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: 'Validation errors in settings form.' };
  }

  const d = validation.data;

  try {
    const prev = await query('SELECT * FROM studio_settings WHERE id = $1;', ['default']);

    await query(
      `
      INSERT INTO studio_settings (
        id, studio_name, phone, email, address,
        working_hours_per_day, late_grace_period_minutes,
        half_day_minimum_minutes, full_day_minimum_minutes,
        overtime_threshold_minutes, require_work_approval, require_attendance_approval,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        studio_name = EXCLUDED.studio_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        working_hours_per_day = EXCLUDED.working_hours_per_day,
        late_grace_period_minutes = EXCLUDED.late_grace_period_minutes,
        half_day_minimum_minutes = EXCLUDED.half_day_minimum_minutes,
        full_day_minimum_minutes = EXCLUDED.full_day_minimum_minutes,
        overtime_threshold_minutes = EXCLUDED.overtime_threshold_minutes,
        require_work_approval = EXCLUDED.require_work_approval,
        require_attendance_approval = EXCLUDED.require_attendance_approval,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [
        'default', d.studioName, d.phone, d.email, d.address,
        d.workingHoursPerDay, d.lateGracePeriodMinutes,
        d.halfDayMinimumMinutes, d.fullDayMinimumMinutes,
        d.overtimeThresholdMinutes, d.requireWorkApproval, d.requireAttendanceApproval,
      ]
    );

    await logAuditEvent({
      actorId: session.userId,
      actorEmail: session.email,
      action: 'SETTINGS_UPDATED',
      entityType: 'studio_settings',
      entityId: 'default',
      reason: 'Studio configuration updated by administrator',
      beforeValues: prev.rows[0] || {},
      afterValues: d,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

