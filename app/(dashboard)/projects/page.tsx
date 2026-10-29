import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { ProjectsView } from '@/components/projects/projects-view';

export const metadata = {
  title: 'Projects — Studio GFX Photography',
};

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin';
  const staffId = session.staffId;

  // Query projects:
  // If Admin: show all studio projects
  // If Staff: show ONLY projects assigned to this staff member (via project_assignments or tasks)
  let queryText = `
    SELECT 
      p.id,
      p.project_code,
      p.project_name,
      p.client_name,
      p.client_contact,
      p.event_type,
      p.event_date::text,
      p.location,
      p.is_out_of_station,
      p.delivery_deadline::text,
      p.status,
      p.remarks,
      p.created_at::text,
      COUNT(DISTINCT pa.staff_id) AS assigned_staff_count,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('Pending','In Progress')) AS pending_tasks,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved'), 0)::numeric AS total_approved_points,
      STRING_AGG(DISTINCT pa_user.role, ', ') AS my_role,
      COUNT(DISTINCT t_user.id) FILTER (WHERE t_user.status IN ('Pending','In Progress')) AS my_pending_tasks
    FROM projects p
    LEFT JOIN project_assignments pa ON pa.project_id = p.id
    LEFT JOIN project_assignments pa_user ON pa_user.project_id = p.id AND pa_user.staff_id = $1
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN tasks t_user ON t_user.project_id = p.id AND t_user.assigned_staff_id = $1
    LEFT JOIN work_entries w ON w.project_id = p.id
  `;

  const params: any[] = [staffId || '00000000-0000-0000-0000-000000000000'];

  if (!isAdmin) {
    queryText += `
      WHERE (
        EXISTS (SELECT 1 FROM project_assignments pa2 WHERE pa2.project_id = p.id AND pa2.staff_id = $1)
        OR EXISTS (SELECT 1 FROM tasks t2 WHERE t2.project_id = p.id AND t2.assigned_staff_id = $1)
      )
    `;
  }

  queryText += `
    GROUP BY p.id
    ORDER BY p.event_date DESC;
  `;

  const projectsRes = await query(queryText, params);

  const staffRes = await query(
    'SELECT id, staff_code, full_name, designation FROM staff WHERE is_active = true ORDER BY staff_code;'
  );

  return (
    <ProjectsView
      projects={projectsRes.rows.map((r) => ({
        ...r,
        assigned_staff_count: parseInt(r.assigned_staff_count || '0', 10),
        pending_tasks: parseInt(r.pending_tasks || '0', 10),
        my_pending_tasks: parseInt(r.my_pending_tasks || '0', 10),
        total_approved_points: parseFloat(r.total_approved_points || '0'),
      }))}
      staffOptions={staffRes.rows}
      isAdmin={isAdmin}
    />
  );
}
