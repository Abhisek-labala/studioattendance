'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { taskSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';
import { createNotification } from '@/lib/notifications/notify';

export interface TaskActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: { [key: string]: string[] };
}

export async function createTaskAction(
  _prevState: TaskActionResponse | null,
  formData: FormData
): Promise<TaskActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  const rawData = {
    projectId: formData.get('projectId')?.toString() || '',
    workflowType: formData.get('workflowType')?.toString() as any,
    taskType: formData.get('taskType')?.toString() as any,
    assignedStaffId: formData.get('assignedStaffId')?.toString() || null,
    deadline: formData.get('deadline')?.toString() || null,
    priority: (formData.get('priority')?.toString() || 'Medium') as any,
    remarks: formData.get('remarks')?.toString() || null,
  };

  const validation = taskSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation errors.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    const result = await query(
      `
      INSERT INTO tasks (
        project_id, workflow_type, task_type, assigned_staff_id,
        deadline, priority, status, remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)
      RETURNING id;
      `,
      [
        data.projectId, data.workflowType, data.taskType,
        data.assignedStaffId || null, data.deadline || null,
        data.priority, data.remarks || null,
      ]
    );

    // Notify assigned staff
    if (data.assignedStaffId) {
      const staffRes = await query('SELECT user_id, full_name FROM staff WHERE id = $1;', [data.assignedStaffId]);
      if (staffRes.rows.length > 0 && staffRes.rows[0].user_id) {
        await createNotification({
          userId: staffRes.rows[0].user_id,
          title: 'New Task Assigned',
          message: `You have been assigned: ${data.taskType} (${data.priority} priority).`,
          type: 'TASK_ASSIGNED',
          link: '/tasks',
        });
      }
    }

    await logAuditEvent({
      actorId: session.userId,
      actorEmail: session.email,
      action: 'TASK_UPDATED',
      entityType: 'task',
      entityId: result.rows[0].id,
      reason: `Task created: ${data.taskType}`,
    });

    revalidatePath('/tasks');
    revalidatePath(`/projects/${data.projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTaskStatusAction(
  taskId: string,
  newStatus: 'Pending' | 'In Progress' | 'Completed' | 'Overdue'
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: 'Unauthorized.' };

  try {
    const taskRes = await query('SELECT assigned_staff_id, status FROM tasks WHERE id = $1;', [taskId]);
    if (taskRes.rows.length === 0) return { success: false, error: 'Task not found.' };

    const task = taskRes.rows[0];

    // Non-admins can only update tasks assigned to themselves
    if (session.role !== 'admin' && task.assigned_staff_id !== session.staffId) {
      return { success: false, error: 'You can only update tasks assigned to you.' };
    }

    const completionDate = newStatus === 'Completed' ? new Date() : null;

    await query(
      `
      UPDATE tasks
      SET 
        status = $1,
        completion_date = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
      `,
      [newStatus, completionDate, taskId]
    );

    revalidatePath('/tasks');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

