'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { projectSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';

export interface ProjectActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: { [key: string]: string[] };
}

export async function createProjectAction(
  _prevState: ProjectActionResponse | null,
  formData: FormData
): Promise<ProjectActionResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin access required.' };
  }

  const rawData = {
    projectCode: formData.get('projectCode')?.toString().trim() || '',
    projectName: formData.get('projectName')?.toString().trim() || '',
    clientName: formData.get('clientName')?.toString().trim() || '',
    clientContact: formData.get('clientContact')?.toString().trim() || null,
    eventType: formData.get('eventType')?.toString().trim() || '',
    eventDate: formData.get('eventDate')?.toString().trim() || '',
    location: formData.get('location')?.toString().trim() || '',
    isOutOfStation: formData.get('isOutOfStation') === 'true' || formData.get('isOutOfStation') === 'on',
    deliveryDeadline: formData.get('deliveryDeadline')?.toString().trim() || null,
    status: (formData.get('status')?.toString() || 'Planned') as any,
    remarks: formData.get('remarks')?.toString().trim() || null,
  };

  const validation = projectSchema.omit({ photographerIds: true, editorIds: true }).safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please fix the validation errors.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    const existing = await query('SELECT id FROM projects WHERE project_code = $1;', [data.projectCode]);
    if (existing.rows.length > 0) {
      return { success: false, error: `Project code "${data.projectCode}" already exists.` };
    }

    const result = await query(
      `
      INSERT INTO projects (
        project_code, project_name, client_name, client_contact,
        event_type, event_date, location, is_out_of_station,
        delivery_deadline, status, remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
      `,
      [
        data.projectCode, data.projectName, data.clientName, data.clientContact,
        data.eventType, data.eventDate, data.location, data.isOutOfStation,
        data.deliveryDeadline || null, data.status, data.remarks || null,
      ]
    );

    await logAuditEvent({
      actorId: session.userId,
      actorEmail: session.email,
      action: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: result.rows[0].id,
      reason: `Created project ${data.projectName} (${data.projectCode})`,
      afterValues: data,
    });

    revalidatePath('/projects');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProjectStatusAction(
  projectId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const prev = await query('SELECT status, project_name FROM projects WHERE id = $1;', [projectId]);
    if (prev.rows.length === 0) return { success: false, error: 'Project not found.' };

    await withTransaction(async (client) => {
      await client.query(
        'UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;',
        [newStatus, projectId]
      );
      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: 'PROJECT_UPDATED',
        entityType: 'project',
        entityId: projectId,
        reason: `Status changed to ${newStatus}`,
        beforeValues: { status: prev.rows[0].status },
        afterValues: { status: newStatus },
      });
    });

    revalidatePath('/projects');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function assignStaffToProjectAction(
  projectId: string,
  staffId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await query(
      `
      INSERT INTO project_assignments (project_id, staff_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, staff_id, role) DO NOTHING;
      `,
      [projectId, staffId, role]
    );
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

