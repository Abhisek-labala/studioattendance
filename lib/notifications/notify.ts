import pool, { query } from '@/db/pool';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type:
    | 'WORK_SUBMITTED'
    | 'WORK_APPROVED'
    | 'WORK_REJECTED'
    | 'LEAVE_APPROVED'
    | 'LEAVE_REJECTED'
    | 'TASK_ASSIGNED'
    | 'DEADLINE_APPROACHING'
    | 'TASK_OVERDUE'
    | 'SYSTEM';
  link?: string | null;
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await query(
      `
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5);
      `,
      [payload.userId, payload.title, payload.message, payload.type, payload.link || null]
    );
  } catch (err: any) {
    console.error('[Notification Error] Failed to create notification:', err.message);
  }
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationPayload['type'],
  link?: string
): Promise<void> {
  try {
    const admins = await query<{ id: string }>('SELECT id FROM users WHERE role = $1 AND is_active = true;', ['admin']);
    for (const admin of admins.rows) {
      await createNotification({
        userId: admin.id,
        title,
        message,
        type,
        link,
      });
    }
  } catch (err: any) {
    console.error('[Notification Error] Failed to broadcast to admins:', err.message);
  }
}

export async function getUserNotifications(userId: string, limit: number = 20) {
  const result = await query(
    `
    SELECT id, title, message, type, link, is_read AS "isRead", created_at AS "createdAt"
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2;
    `,
    [userId, limit]
  );
  return result.rows;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await query(
    `
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE user_id = $1 AND is_read = false;
    `,
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  await query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND user_id = $2;
    `,
    [notificationId, userId]
  );
}

