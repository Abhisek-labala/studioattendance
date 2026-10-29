import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { TasksView } from '@/components/tasks/tasks-view';

export const metadata = {
  title: 'Tasks — Studio GFX Photography',
};

export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin';
  const staffId = session.staffId;

  // Auto-provision sample tasks for staff if they are assigned to a project but have no tasks yet
  if (!isAdmin && staffId) {
    const countRes = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE assigned_staff_id = $1;',
      [staffId]
    );
    const existingCount = parseInt(countRes.rows[0]?.count || '0', 10);

    if (existingCount === 0) {
      // Find a project this staff is assigned to
      const assignedProj = await query(
        'SELECT project_id FROM project_assignments WHERE staff_id = $1 LIMIT 1;',
        [staffId]
      );
      if (assignedProj.rows.length > 0) {
        const pId = assignedProj.rows[0].project_id;
        await query(
          `INSERT INTO tasks (project_id, workflow_type, task_type, assigned_staff_id, deadline, priority, status, remarks)
           VALUES 
             ($1, 'Photo', 'Photo Editing', $2, CURRENT_DATE + INTERVAL '5 days', 'High', 'In Progress', 'Candid photo retouching & Lightroom color grading (800 selects).'),
             ($1, 'Photo', 'Album Design', $2, CURRENT_DATE + INTERVAL '12 days', 'Medium', 'Pending', 'Design 40 royal layout spreads in Canvera album format.');`,
          [pId, staffId]
        );
      }
    }
  }

  // Fetch tasks - staff strictly only see their own assigned tasks
  let tasksQuery = `
    SELECT 
      t.id,
      t.workflow_type,
      t.task_type,
      t.priority,
      t.status,
      t.deadline::text,
      t.completion_date::text,
      t.remarks,
      t.created_at::text,
      p.id AS project_id,
      p.project_name,
      p.project_code,
      p.event_date::text,
      p.location AS project_location,
      s.id AS staff_id,
      s.full_name AS assigned_to,
      s.staff_code AS assigned_code,
      CASE WHEN t.deadline < CURRENT_DATE AND t.status NOT IN ('Completed') THEN true ELSE false END AS is_overdue
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN staff s ON s.id = t.assigned_staff_id
  `;

  const params: any[] = [];
  if (!isAdmin) {
    tasksQuery += ' WHERE t.assigned_staff_id = $1';
    params.push(staffId || '00000000-0000-0000-0000-000000000000');
  }

  tasksQuery += `
    ORDER BY 
      CASE WHEN t.status = 'Completed' THEN 2 ELSE 1 END,
      t.deadline ASC NULLS LAST,
      t.priority DESC;
  `;

  const tasksRes = await query(tasksQuery, params);

  // Projects options for create task modal (Admin only)
  let projectOptions: any[] = [];
  let staffOptions: any[] = [];
  if (isAdmin) {
    const projectsRes = await query(
      "SELECT id, project_code, project_name FROM projects WHERE status NOT IN ('Completed') ORDER BY event_date DESC;"
    );
    projectOptions = projectsRes.rows;

    const staffRes = await query(
      'SELECT id, staff_code, full_name FROM staff WHERE is_active = true ORDER BY staff_code;'
    );
    staffOptions = staffRes.rows;
  }

  return (
    <TasksView
      tasks={tasksRes.rows}
      projectOptions={projectOptions}
      staffOptions={staffOptions}
      isAdmin={isAdmin}
      currentStaffId={staffId}
    />
  );
}
