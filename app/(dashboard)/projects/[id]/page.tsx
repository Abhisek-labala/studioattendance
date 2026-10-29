import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Award,
  Clock,
  CheckCircle2,
  Phone,
  FileSpreadsheet,
  CheckSquare,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatKolkataDate, formatPoints } from '@/lib/utils';
import { assignStaffToProjectAction, updateProjectStatusAction } from '@/app/actions/projects';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Project Details — Studio GFX Photography',
};

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin';

  // 1. Fetch Project Details
  const projRes = await query('SELECT * FROM projects WHERE id = $1;', [id]);
  if (projRes.rows.length === 0) notFound();
  const project = projRes.rows[0];

  // 2. Fetch Assigned Staff
  const assignmentsRes = await query(
    `
    SELECT pa.id, pa.role, pa.assigned_at::text, s.id AS staff_id, s.full_name, s.staff_code, s.designation
    FROM project_assignments pa
    JOIN staff s ON s.id = pa.staff_id
    WHERE pa.project_id = $1
    ORDER BY pa.assigned_at ASC;
    `,
    [id]
  );
  const assignments = assignmentsRes.rows;

  // 3. Fetch Tasks for this Project
  const tasksRes = await query(
    `
    SELECT t.*, s.full_name AS assigned_to
    FROM tasks t
    LEFT JOIN staff s ON s.id = t.assigned_staff_id
    WHERE t.project_id = $1
    ORDER BY t.created_at ASC;
    `,
    [id]
  );
  const tasks = tasksRes.rows;

  // 4. Fetch Work Entries logged for this Project
  const workRes = await query(
    `
    SELECT w.*, s.full_name AS staff_name, s.staff_code
    FROM work_entries w
    JOIN staff s ON s.id = w.staff_id
    WHERE w.project_id = $1
    ORDER BY w.work_date DESC;
    `,
    [id]
  );
  const workEntries = workRes.rows;

  // 5. Fetch available staff for assignment (if admin)
  let availableStaff: any[] = [];
  if (isAdmin) {
    const staffRes = await query(
      'SELECT id, staff_code, full_name, designation FROM staff WHERE is_active = true ORDER BY staff_code ASC;'
    );
    availableStaff = staffRes.rows;
  }

  const totalPointsApproved = workEntries
    .filter((w: any) => w.status === 'Approved')
    .reduce((sum: number, w: any) => sum + parseFloat(w.total_points), 0);

  // Security check: non-admin staff can only view projects they are assigned to
  if (!isAdmin) {
    const isAssigned =
      assignments.some((a: any) => a.staff_id === session.staffId) ||
      tasks.some((t: any) => t.assigned_staff_id === session.staffId);
    if (!isAssigned) {
      redirect('/projects');
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Project Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{project.project_name}</h1>
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {project.project_code}
              </span>
              <Badge variant="outline" className="text-xs font-semibold">
                {project.status}
              </Badge>
              {project.is_out_of_station && (
                <Badge variant="warning" className="text-[10px]">
                  Out-of-Station
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Client:</span> {project.client_name}
              {project.client_contact && <span> &middot; {project.client_contact}</span>}
              <span> &middot; Event: <strong className="text-slate-800">{project.event_type}</strong></span>
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Event: <strong>{formatKolkataDate(project.event_date)}</strong>
              </span>
              {project.delivery_deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Delivery Deadline: <strong>{formatKolkataDate(project.delivery_deadline)}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {project.location}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-right shrink-0">
            <p className="text-[10px] text-amber-800 uppercase font-semibold">Total Approved Points</p>
            <p className="text-2xl font-bold text-amber-600">{formatPoints(totalPointsApproved)} pts</p>
          </div>
        </div>

        {project.remarks && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Remarks / Brief: </span>
            {project.remarks}
          </div>
        )}
      </div>

      {/* Grid: Crew Assignment & Project Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Crew */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Assigned Team Crew ({assignments.length})
              </h3>
            </div>
          </div>

          {isAdmin && (
            <div className="p-3 bg-slate-50 border-b border-slate-100">
              <form
                action={async (formData: FormData) => {
                  'use server';
                  const staffId = formData.get('staffId')?.toString();
                  const role = formData.get('role')?.toString();
                  if (staffId && role) {
                    await assignStaffToProjectAction(id, staffId, role);
                  }
                }}
                className="flex items-center gap-2 text-xs"
              >
                <select
                  name="staffId"
                  required
                  className="flex-1 h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900"
                >
                  <option value="">Select Staff Member</option>
                  {availableStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.staff_code} - {s.designation})
                    </option>
                  ))}
                </select>
                <select
                  name="role"
                  required
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900"
                >
                  <option value="Lead">Lead</option>
                  <option value="Photographer">Photographer</option>
                  <option value="Videographer">Videographer</option>
                  <option value="Photo Editor">Photo Editor</option>
                  <option value="Video Editor">Video Editor</option>
                </select>
                <button
                  type="submit"
                  className="h-8 rounded bg-slate-900 px-3 text-white font-medium hover:bg-slate-800"
                >
                  Assign
                </button>
              </form>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {assignments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No staff members currently assigned to this project.
              </div>
            ) : (
              assignments.map((a: any) => (
                <div key={a.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <Link
                      href={`/staff/${a.staff_id}`}
                      className="font-bold text-slate-900 hover:text-amber-600 hover:underline"
                    >
                      {a.full_name}
                    </Link>
                    <p className="font-mono text-[10px] text-slate-500">
                      {a.staff_code} &middot; {a.designation}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-semibold text-[10px]">
                    {a.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workflow Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Workflow Tasks ({tasks.length})
              </h3>
            </div>
            <Link href="/tasks" className="text-xs font-semibold text-amber-600 hover:underline">
              Task Board
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No workflow tasks logged for this project yet.
              </div>
            ) : (
              tasks.map((t: any) => (
                <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{t.task_type}</p>
                    <p className="text-[10px] text-slate-500">
                      Assigned: {t.assigned_to || 'Unassigned'}
                      {t.deadline && <span> &middot; Due: {formatKolkataDate(t.deadline)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        t.status === 'Completed'
                          ? 'success'
                          : t.status === 'In Progress'
                          ? 'warning'
                          : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {t.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Work Entries & Productivity Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Logged Work Register & Points for this Project
            </h3>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Staff Member</TableHead>
              <TableHead>Work Type</TableHead>
              <TableHead className="text-center">Qty / Duration</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-400">
                  No work entries submitted for this project yet.
                </TableCell>
              </TableRow>
            ) : (
              workEntries.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="text-xs text-slate-600 font-medium">
                    {formatKolkataDate(w.work_date)}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-bold text-slate-900">{w.staff_name}</p>
                    <p className="font-mono text-[10px] text-slate-500">{w.staff_code}</p>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">
                    {w.work_type}
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium text-slate-700">
                    {w.quantity_or_duration}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs text-slate-900">
                    {formatPoints(w.total_points)} pts
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        w.status === 'Approved'
                          ? 'success'
                          : w.status === 'Rejected'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-[10px]"
                    >
                      {w.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 italic max-w-xs truncate">
                    {w.remarks || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

