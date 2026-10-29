import pool, { query } from '@/db/pool';

export interface AuditLogEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action:
    | 'ATTENDANCE_PUNCH'
    | 'ATTENDANCE_CORRECTION'
    | 'WORK_APPROVAL'
    | 'WORK_REJECTION'
    | 'POINT_ADJUSTMENT'
    | 'STAFF_CREATED'
    | 'STAFF_UPDATED'
    | 'STAFF_DEACTIVATED'
    | 'LEAVE_APPROVAL'
    | 'LEAVE_REJECTION'
    | 'PROJECT_CREATED'
    | 'PROJECT_UPDATED'
    | 'TASK_UPDATED'
    | 'SETTINGS_UPDATED'
    | 'RULE_UPDATE';
  entityType: string;
  entityId: string;
  reason?: string | null;
  beforeValues?: any;
  afterValues?: any;
  ipAddress?: string | null;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await query(
      `
      INSERT INTO audit_logs (
        actor_id, actor_email, action, entity_type,
        entity_id, reason, before_values, after_values, ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `,
      [
        entry.actorId || null,
        entry.actorEmail || null,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.reason || null,
        entry.beforeValues ? JSON.stringify(entry.beforeValues) : null,
        entry.afterValues ? JSON.stringify(entry.afterValues) : null,
        entry.ipAddress || null,
      ]
    );
  } catch (err: any) {
    console.error('[Audit Logger Error] Failed to write audit event:', err.message);
  }
}

