import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { WorkSubmissionCard } from '@/components/work/work-submission-card';
import { WorkEntriesTable, WorkEntryItem } from '@/components/work/work-entries-table';
import { Card, CardContent } from '@/components/ui/card';
import { formatPoints } from '@/lib/utils';
import { Award, Clock, Camera, Film } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    staff?: string;
  }>;
}

export const metadata = {
  title: 'Work Register & Productivity — Studio GFX Photography',
};

export default async function WorkRegisterPage({ searchParams }: PageProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const sp = await searchParams;
  const isAdmin = session.role === 'admin';

  // 1. Determine staff scope
  let filterStaffId = isAdmin ? sp.staff || null : session.staffId;

  // 2. Fetch staff options (for admin)
  let staffOptions: any[] = [];
  if (isAdmin) {
    const staffRes = await query(
      'SELECT id, staff_code, full_name FROM staff WHERE is_active = true ORDER BY staff_code ASC;'
    );
    staffOptions = staffRes.rows;
  }

  // 3. Fetch projects: all for admin, only assigned projects for staff
  let projectOptions: any[] = [];
  if (isAdmin) {
    const projRes = await query(
      'SELECT id, project_code, project_name, is_out_of_station FROM projects ORDER BY created_at DESC;'
    );
    projectOptions = projRes.rows;
  } else {
    const projRes = await query(
      `SELECT DISTINCT p.id, p.project_code, p.project_name, p.is_out_of_station 
       FROM projects p
       WHERE EXISTS (SELECT 1 FROM project_assignments pa WHERE pa.project_id = p.id AND pa.staff_id = $1)
          OR EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = p.id AND t.assigned_staff_id = $1)
       ORDER BY p.project_code ASC;`,
      [session.staffId]
    );
    projectOptions = projRes.rows;
  }

  // 4. Fetch active point rules for dynamic work types and rate calculations
  const rulesRes = await query(
    'SELECT * FROM point_rules WHERE is_active = true ORDER BY created_at ASC;'
  );
  const activePointRules = rulesRes.rows.map((r) => ({
    id: r.id,
    work_type: r.work_type,
    rate_unit: r.rate_unit,
    base_points_per_unit: parseFloat(r.base_points_per_unit),
    late_night_eligible: r.late_night_eligible,
    late_night_bonus_points: parseFloat(r.late_night_bonus_points),
    out_of_station_eligible: r.out_of_station_eligible,
    out_of_station_bonus_points: parseFloat(r.out_of_station_bonus_points),
    rule_version: r.rule_version,
    is_active: r.is_active,
  }));

  // 5. Fetch Work Entries
  let queryText = `
    SELECT 
      w.id,
      w.work_date::text,
      w.staff_id,
      s.full_name AS staff_name,
      s.staff_code,
      w.project_id,
      p.project_name,
      w.work_type,
      w.quantity_or_duration::numeric AS quantity_or_duration,
      w.is_late_night,
      w.is_out_of_station,
      w.is_rework,
      w.base_points::numeric AS base_points,
      w.bonus_points::numeric AS bonus_points,
      w.total_points::numeric AS total_points,
      w.rule_version,
      w.calculation_snapshot,
      w.remarks,
      w.status,
      w.rejection_reason,
      w.submitted_at::text
    FROM work_entries w
    JOIN staff s ON s.id = w.staff_id
    LEFT JOIN projects p ON p.id = w.project_id
  `;
  const params: any[] = [];

  if (filterStaffId) {
    queryText += ' WHERE w.staff_id = $1';
    params.push(filterStaffId);
  }

  queryText += ' ORDER BY w.work_date DESC, w.created_at DESC;';

  const entriesRes = await query(queryText, params);
  const entries: WorkEntryItem[] = entriesRes.rows.map((row) => ({
    ...row,
    quantity_or_duration: parseFloat(row.quantity_or_duration),
    base_points: parseFloat(row.base_points),
    bonus_points: parseFloat(row.bonus_points),
    total_points: parseFloat(row.total_points),
  }));

  // 6. Calculate Metrics
  let approvedPoints = 0;
  let pendingPoints = 0;
  let shootPoints = 0;
  let editPoints = 0;

  entries.forEach((e) => {
    if (e.status === 'Approved') {
      approvedPoints += e.total_points;
      if (e.work_type.includes('Shoot')) {
        shootPoints += e.total_points;
      } else if (e.work_type.includes('Edit')) {
        editPoints += e.total_points;
      }
    } else if (e.status === 'Submitted') {
      pendingPoints += e.total_points;
    }
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Work Register
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Review and manage shoot events, editing sheets, and studio productivity points'
              : 'Log and review shoot events, editing sheets, and studio productivity points'}
          </p>
        </div>

        {/* Admin Staff Filter */}
        {isAdmin && (
          <form method="GET" className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Staff:</span>
            <select
              name="staff"
              defaultValue={filterStaffId || ''}
              className="h-8 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 shadow-sm"
            >
              <option value="">All Studio Staff</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.staff_code})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded bg-slate-900 px-3 text-white font-medium hover:bg-slate-800 text-xs"
            >
              Filter
            </button>
          </form>
        )}
      </div>

      {/* Summary KPI Cards - Compact & Clean */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Approved Points</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                <Award className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-amber-600">
                {formatPoints(approvedPoints)}
              </span>
              <span className="text-[11px] text-slate-400">pts</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Officially credited</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Pending Review</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-700">
                {formatPoints(pendingPoints)}
              </span>
              <span className="text-[11px] text-slate-400">pts</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting admin review</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Shoot Points</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                <Camera className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">
                {formatPoints(shootPoints)}
              </span>
              <span className="text-[11px] text-slate-400">pts</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Weddings & events</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Editing Points</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-600">
                <Film className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">
                {formatPoints(editPoints)}
              </span>
              <span className="text-[11px] text-slate-400">pts</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Albums & video hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Submission Form Card - Only visible to staff; hidden for admin */}
      {!isAdmin && (
        <WorkSubmissionCard
          currentStaffId={session.staffId}
          isAdmin={isAdmin}
          staffOptions={staffOptions}
          projectOptions={projectOptions}
          pointRules={activePointRules}
        />
      )}

      {/* Work Entries Table */}
      <WorkEntriesTable entries={entries} isAdmin={isAdmin} />
    </div>
  );
}
