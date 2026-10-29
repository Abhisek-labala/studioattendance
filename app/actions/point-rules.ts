'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/audit/logger';

export interface PointRuleActionResponse {
  success: boolean;
  error?: string;
}

export async function savePointRuleAction(
  _prevState: PointRuleActionResponse | null,
  formData: FormData
): Promise<PointRuleActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin access required.' };
  }

  const id = formData.get('id')?.toString() || null;
  const workType = formData.get('workType')?.toString().trim() || '';
  const rateUnit = formData.get('rateUnit')?.toString().trim() || 'event';
  const basePoints = parseFloat(formData.get('basePointsPerUnit')?.toString() || '0');
  const lateNightEligible = formData.get('lateNightEligible') === 'true' || formData.get('lateNightEligible') === 'on';
  const lateNightBonus = parseFloat(formData.get('lateNightBonusPoints')?.toString() || '0');
  const outOfStationEligible = formData.get('outOfStationEligible') === 'true' || formData.get('outOfStationEligible') === 'on';
  const outOfStationBonus = parseFloat(formData.get('outOfStationBonusPoints')?.toString() || '0');
  const isActive = formData.get('isActive') === 'true' || formData.get('isActive') === 'on';
  const ruleVersion = formData.get('ruleVersion')?.toString().trim() || '1.0';

  if (!workType) {
    return { success: false, error: 'Work type name is required.' };
  }

  if (isNaN(basePoints) || basePoints < 0) {
    return { success: false, error: 'Base points must be a valid positive number.' };
  }

  try {
    if (id) {
      // Update existing point rule
      const prev = await query('SELECT * FROM point_rules WHERE id = $1;', [id]);
      if (prev.rows.length === 0) return { success: false, error: 'Rule not found.' };

      await withTransaction(async (client) => {
        await client.query(
          `
          UPDATE point_rules
          SET 
            work_type = $1,
            rate_unit = $2,
            base_points_per_unit = $3,
            late_night_eligible = $4,
            late_night_bonus_points = $5,
            out_of_station_eligible = $6,
            out_of_station_bonus_points = $7,
            is_active = $8,
            rule_version = $9
          WHERE id = $10;
          `,
          [
            workType,
            rateUnit,
            basePoints,
            lateNightEligible,
            lateNightBonus,
            outOfStationEligible,
            outOfStationBonus,
            isActive,
            ruleVersion,
            id,
          ]
        );

        await logAuditEvent({
          actorId: session.userId,
          actorEmail: session.email,
          action: 'RULE_UPDATE',
          entityType: 'point_rule',
          entityId: id,
          reason: `Updated rule configuration for "${workType}"`,
          beforeValues: prev.rows[0],
          afterValues: {
            workType,
            rateUnit,
            basePoints,
            lateNightEligible,
            lateNightBonus,
            outOfStationEligible,
            outOfStationBonus,
            isActive,
            ruleVersion,
          },
        });
      });
    } else {
      // Insert new rule
      const insertRes = await query(
        `
        INSERT INTO point_rules (
          rule_version, work_type, rate_unit, base_points_per_unit,
          late_night_eligible, late_night_bonus_points,
          out_of_station_eligible, out_of_station_bonus_points, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (rule_version, work_type) DO UPDATE SET
          rate_unit = EXCLUDED.rate_unit,
          base_points_per_unit = EXCLUDED.base_points_per_unit,
          late_night_eligible = EXCLUDED.late_night_eligible,
          late_night_bonus_points = EXCLUDED.late_night_bonus_points,
          out_of_station_eligible = EXCLUDED.out_of_station_eligible,
          out_of_station_bonus_points = EXCLUDED.out_of_station_bonus_points,
          is_active = EXCLUDED.is_active
        RETURNING id;
        `,
        [
          ruleVersion,
          workType,
          rateUnit,
          basePoints,
          lateNightEligible,
          lateNightBonus,
          outOfStationEligible,
          outOfStationBonus,
          isActive,
        ]
      );

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: 'RULE_UPDATE',
        entityType: 'point_rule',
        entityId: insertRes.rows[0].id,
        reason: `Created new point rule: "${workType}" (${basePoints} pts / ${rateUnit})`,
      });
    }

    revalidatePath('/point-rules');
    revalidatePath('/work-register');
    return { success: true };
  } catch (err: any) {
    console.error('[Save Point Rule Error]:', err);
    return { success: false, error: err.message };
  }
}

export async function togglePointRuleStatusAction(
  ruleId: string,
  newActiveState: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const res = await query('UPDATE point_rules SET is_active = $1 WHERE id = $2 RETURNING work_type;', [
      newActiveState,
      ruleId,
    ]);

    await logAuditEvent({
      actorId: session.userId,
      actorEmail: session.email,
      action: 'RULE_UPDATE',
      entityType: 'point_rule',
      entityId: ruleId,
      reason: `${newActiveState ? 'Activated' : 'Deactivated'} rule for "${res.rows[0]?.work_type}"`,
    });

    revalidatePath('/point-rules');
    revalidatePath('/work-register');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePointRuleAction(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const prev = await query('SELECT work_type FROM point_rules WHERE id = $1;', [ruleId]);
    if (prev.rows.length === 0) return { success: false, error: 'Rule not found.' };

    await query('DELETE FROM point_rules WHERE id = $1;', [ruleId]);

    await logAuditEvent({
      actorId: session.userId,
      actorEmail: session.email,
      action: 'RULE_UPDATE',
      entityType: 'point_rule',
      entityId: ruleId,
      reason: `Deleted point rule "${prev.rows[0].work_type}"`,
    });

    revalidatePath('/point-rules');
    revalidatePath('/work-register');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
