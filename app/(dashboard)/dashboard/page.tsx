import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  CalendarCheck,
  FolderKanban,
  Award,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Activity,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { StaffPerformanceTable } from '@/components/dashboard/staff-performance-table';
import { StaffPersonalTargetCard } from '@/components/dashboard/staff-personal-target-card';
import { formatKolkataDate, formatPoints } from '@/lib/utils';

export const metadata = {
  title: 'Dashboard — Studio GFX Photography',
};

export const revalidate = 60; // Refresh every 60 seconds

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.role === 'admin';
  const staffId = session.staffId;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthShort = now.toLocaleString('default', { month: 'short' });
  const today = now.toISOString().split('T')[0];
  const monthStart = today.substring(0, 8) + '01';

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0].substring(0, 8) + '01';

  // ---------------------------------------------------------------------------
  // ADMIN DASHBOARD
  // ---------------------------------------------------------------------------
  if (isAdmin) {
    // 1. Studio Active Staff Count
    const activeStaffRes = await query('SELECT COUNT(*) as count FROM staff WHERE is_active = true;');
    const activeStaffCount = parseInt(activeStaffRes.rows[0]?.count || '0', 10);

    // 2. Studio Today's Attendance Breakdown
    const todayAttRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE a.status = 'Present') AS present_count,
        COUNT(*) FILTER (WHERE a.status = 'Half Day') AS half_day_count,
        COUNT(*) FILTER (WHERE a.status = 'Absent') AS absent_count,
        COUNT(*) FILTER (WHERE a.status = 'Leave') AS leave_count
      FROM attendance a
      WHERE a.date = $1;
    `, [today]);
    const todayAtt = todayAttRes.rows[0] || {};

    // 3. Studio Active Projects Count
    const activeProjectsRes = await query(`
      SELECT COUNT(*) as count FROM projects 
      WHERE status NOT IN ('Completed', 'Delivered');
    `);
    const activeProjectsCount = parseInt(activeProjectsRes.rows[0]?.count || '0', 10);

    // 4. Studio Today's Shoots
    const todayShootsRes = await query(`
      SELECT project_name, event_type, location, is_out_of_station
      FROM projects
      WHERE event_date = $1
      ORDER BY project_name;
    `, [today]);

    // 5. Studio Monthly Points & Targets for all Staff
    const monthlyPointsRes = await query(`
      SELECT 
        s.id AS staff_id,
        s.full_name,
        s.staff_code,
        s.designation,
        COALESCE(smt.target_points, s.monthly_target_points, 150.00)::numeric AS target_points,
        COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved'), 0)::numeric AS approved_points,
        COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Submitted'), 0)::numeric AS pending_points,
        COUNT(w.id) FILTER (WHERE w.status = 'Approved') AS approved_count
      FROM staff s
      LEFT JOIN staff_monthly_targets smt ON smt.staff_id = s.id 
        AND smt.year = $2 AND smt.month = $3
      LEFT JOIN work_entries w ON w.staff_id = s.id 
        AND w.work_date >= $1
      WHERE s.is_active = true
      GROUP BY s.id, s.full_name, s.staff_code, s.designation, smt.target_points, s.monthly_target_points
      ORDER BY approved_points DESC;
    `, [monthStart, currentYear, currentMonth]);

    // 6. Pending Work Approvals studio-wide
    const pendingApprovalsRes = await query(`
      SELECT COUNT(*) as count FROM work_entries WHERE status = 'Submitted';
    `);
    const pendingApprovalsCount = parseInt(pendingApprovalsRes.rows[0]?.count || '0', 10);

    // 7. Studio Pending Tasks
    const pendingTasksRes = await query(`
      SELECT 
        t.id,
        t.task_type,
        t.priority,
        t.deadline::text,
        p.project_name,
        s.full_name AS assigned_to,
        CASE WHEN t.deadline < CURRENT_DATE THEN true ELSE false END AS is_overdue
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN staff s ON s.id = t.assigned_staff_id
      WHERE t.status IN ('Pending', 'In Progress')
      ORDER BY t.deadline ASC NULLS LAST
      LIMIT 8;
    `);

    // 8. Studio Chart Data (last 6 months, all staff)
    const chartDataRes = await query(`
      SELECT 
        TO_CHAR(work_date, 'YYYY-MM') AS month_key,
        TO_CHAR(work_date, 'Mon YY') AS month_label,
        COALESCE(SUM(total_points) FILTER (WHERE work_type LIKE '%Shoot'), 0)::numeric AS shoot_points,
        COALESCE(SUM(total_points) FILTER (WHERE work_type = 'Album Photo Edit'), 0)::numeric AS album_points,
        COALESCE(SUM(total_points) FILTER (WHERE work_type = 'Video Edit'), 0)::numeric AS video_points,
        COALESCE(SUM(total_points), 0)::numeric AS total_points
      FROM work_entries
      WHERE status = 'Approved' AND work_date >= $1
      GROUP BY month_key, month_label
      ORDER BY month_key ASC;
    `, [sixMonthsAgoStr]);

    // 9. Recent Audit Trail
    const auditRes = await query(`
      SELECT action, entity_type, reason, created_at::text, actor_email
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 6;
    `);

    const monthPointsStaff = monthlyPointsRes.rows.map(r => {
      const approved = parseFloat(r.approved_points || '0');
      const target = parseFloat(r.target_points || '150');
      const percent = target > 0 ? (approved / target) * 100 : 0;
      return {
        staff_id: r.staff_id,
        full_name: r.full_name,
        staff_code: r.staff_code,
        designation: r.designation,
        target_points: target,
        approved_points: approved,
        pending_points: parseFloat(r.pending_points || '0'),
        approved_count: parseInt(r.approved_count || '0', 10),
        performance_percent: percent,
      };
    });

    const chartData = chartDataRes.rows.map(r => ({
      month: r.month_label,
      Shoot: parseFloat(r.shoot_points),
      Album: parseFloat(r.album_points),
      Video: parseFloat(r.video_points),
      Total: parseFloat(r.total_points),
    }));

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Studio Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Studio GFX Photography &mdash; {formatKolkataDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Studio KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Staff</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{activeStaffCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <Link href="/staff" className="mt-3 text-[11px] font-semibold text-amber-600 hover:underline block">
                Manage Staff →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Present Today</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{todayAtt.present_count || 0}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CalendarCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                <span className="text-amber-600 font-semibold">HD: {todayAtt.half_day_count || 0}</span>
                <span>·</span>
                <span className="text-red-600 font-semibold">Abs: {todayAtt.absent_count || 0}</span>
                <span>·</span>
                <span className="text-blue-600 font-semibold">Lv: {todayAtt.leave_count || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Projects</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{activeProjectsCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <FolderKanban className="h-5 w-5" />
                </div>
              </div>
              <Link href="/projects" className="mt-3 text-[11px] font-semibold text-amber-600 hover:underline block">
                View Projects →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending Approvals</p>
                  <p className={`text-3xl font-bold mt-1 ${pendingApprovalsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {pendingApprovalsCount}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pendingApprovalsCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <Link href="/work-register" className="mt-3 text-[11px] font-semibold text-amber-600 hover:underline block">
                Review Work Entries →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Studio Today's Shoots */}
        {todayShootsRes.rows.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-amber-700" />
              <h3 className="text-sm font-bold text-amber-900">Today&apos;s Scheduled Shoots ({todayShootsRes.rows.length})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {todayShootsRes.rows.map((shoot: any, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 px-3 py-2 shadow-sm text-xs">
                  <span className="font-bold text-slate-900">{shoot.project_name}</span>
                  <span className="text-slate-400">&mdash;</span>
                  <span className="text-slate-600">{shoot.event_type}</span>
                  <span className="text-slate-400">&mdash;</span>
                  <span className="text-slate-600">{shoot.location}</span>
                  {shoot.is_out_of_station && (
                    <Badge variant="warning" className="text-[10px]">Out-of-Station</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts & Pending Tasks */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <DashboardCharts chartData={chartData} title="Studio Monthly Productivity Points" description="Approved points breakdown across all staff — last 6 months" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Pending Tasks</h3>
              </div>
              <Link href="/tasks" className="text-[11px] font-semibold text-amber-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingTasksRes.rows.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  All tasks are completed!
                </div>
              ) : (
                pendingTasksRes.rows.map((task: any) => (
                  <div key={task.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{task.task_type}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {task.project_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {task.is_overdue && (
                          <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                        )}
                        <Badge
                          variant={task.priority === 'Urgent' ? 'destructive' : task.priority === 'High' ? 'warning' : 'secondary'}
                          className="text-[10px]"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    {task.deadline && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Due: {formatKolkataDate(task.deadline)}
                        {task.assigned_to && <span> &middot; {task.assigned_to}</span>}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Monthly Staff Performance & Target Table (Admin Only) */}
        <StaffPerformanceTable
          data={monthPointsStaff}
          isAdmin={true}
          currentYear={currentYear}
          currentMonth={currentMonth}
        />

        {/* Admin Activity Log */}
        {auditRes.rows.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Recent Activity Log</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {auditRes.rows.map((log: any, i: number) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="ml-2 text-slate-500">{log.reason || log.entity_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 flex-shrink-0 text-[11px]">
                    <span>{log.actor_email || 'System'}</span>
                    <span>&middot;</span>
                    <span>{formatKolkataDate(log.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STAFF MEMBER DASHBOARD (Strictly Personal Data Only)
  // ---------------------------------------------------------------------------
  // 1. Personal Monthly Target & Points (Current Month)
  const personalPointsRes = await query(`
    SELECT 
      s.id AS staff_id,
      s.full_name,
      s.staff_code,
      s.designation,
      COALESCE(smt.target_points, s.monthly_target_points, 150.00)::numeric AS target_points,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved'), 0)::numeric AS approved_points,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Submitted'), 0)::numeric AS pending_points,
      COUNT(w.id) FILTER (WHERE w.status = 'Approved') AS approved_count,
      COUNT(w.id) FILTER (WHERE w.status = 'Submitted') AS pending_count
    FROM staff s
    LEFT JOIN staff_monthly_targets smt ON smt.staff_id = s.id 
      AND smt.year = $2 AND smt.month = $3
    LEFT JOIN work_entries w ON w.staff_id = s.id 
      AND w.work_date >= $1
    WHERE s.id = $4
    GROUP BY s.id, s.full_name, s.staff_code, s.designation, smt.target_points, s.monthly_target_points;
  `, [monthStart, currentYear, currentMonth, staffId]);

  const personalData = personalPointsRes.rows[0] || {
    staff_id: staffId,
    full_name: session.fullName || 'Staff Member',
    target_points: 150,
    approved_points: 0,
    pending_points: 0,
    approved_count: 0,
    pending_count: 0,
  };

  const targetPoints = parseFloat(personalData.target_points || '150');
  const approvedPoints = parseFloat(personalData.approved_points || '0');
  const pendingPoints = parseFloat(personalData.pending_points || '0');
  const pendingCount = parseInt(personalData.pending_count || '0', 10);
  const performancePercent = targetPoints > 0 ? (approvedPoints / targetPoints) * 100 : 0;

  // 2. Personal Attendance This Month
  const personalAttRes = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE a.status = 'Present') AS present_count,
      COUNT(*) FILTER (WHERE a.status = 'Half Day') AS half_day_count,
      COUNT(*) FILTER (WHERE a.status = 'Absent') AS absent_count,
      COUNT(*) FILTER (WHERE a.status = 'Leave') AS leave_count
    FROM attendance a
    WHERE a.staff_id = $1 AND a.date >= $2 AND a.date <= $3;
  `, [staffId, monthStart, today]);
  const personalAtt = personalAttRes.rows[0] || {};

  // 3. Personal Active Tasks Summary & List
  const personalTaskSummaryRes = await query(`
    SELECT 
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE deadline < CURRENT_DATE) AS overdue_count
    FROM tasks
    WHERE assigned_staff_id = $1 AND status IN ('Pending', 'In Progress');
  `, [staffId]);
  const personalTaskSummary = personalTaskSummaryRes.rows[0] || { total_count: 0, overdue_count: 0 };

  const personalTasksRes = await query(`
    SELECT 
      t.id,
      t.task_type,
      t.priority,
      t.deadline::text,
      p.project_name,
      CASE WHEN t.deadline < CURRENT_DATE THEN true ELSE false END AS is_overdue
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.assigned_staff_id = $1 AND t.status IN ('Pending', 'In Progress')
    ORDER BY t.deadline ASC NULLS LAST
    LIMIT 6;
  `, [staffId]);

  // 4. Personal Assigned Shoots for Today
  const personalShootsRes = await query(`
    SELECT p.project_name, p.event_type, p.location, p.is_out_of_station, pa.role
    FROM project_assignments pa
    JOIN projects p ON p.id = pa.project_id
    WHERE pa.staff_id = $1 AND p.event_date = $2
    ORDER BY p.project_name;
  `, [staffId, today]);

  // 5. Personal Chart Data (Last 6 Months, ONLY this staff member)
  const personalChartRes = await query(`
    SELECT 
      TO_CHAR(work_date, 'YYYY-MM') AS month_key,
      TO_CHAR(work_date, 'Mon YY') AS month_label,
      COALESCE(SUM(total_points) FILTER (WHERE work_type LIKE '%Shoot'), 0)::numeric AS shoot_points,
      COALESCE(SUM(total_points) FILTER (WHERE work_type = 'Album Photo Edit'), 0)::numeric AS album_points,
      COALESCE(SUM(total_points) FILTER (WHERE work_type = 'Video Edit'), 0)::numeric AS video_points,
      COALESCE(SUM(total_points), 0)::numeric AS total_points
    FROM work_entries
    WHERE status = 'Approved' AND work_date >= $1 AND staff_id = $2
    GROUP BY month_key, month_label
    ORDER BY month_key ASC;
  `, [sixMonthsAgoStr, staffId]);

  const personalChartData = personalChartRes.rows.map(r => ({
    month: r.month_label,
    Shoot: parseFloat(r.shoot_points),
    Album: parseFloat(r.album_points),
    Video: parseFloat(r.video_points),
    Total: parseFloat(r.total_points),
  }));

  // 6. Personal Recent Work Entries
  const personalWorkEntriesRes = await query(`
    SELECT 
      w.id,
      w.work_date::text,
      w.work_type,
      w.quantity_or_duration,
      w.total_points,
      w.status,
      w.remarks,
      w.rejection_reason,
      p.project_name
    FROM work_entries w
    LEFT JOIN projects p ON p.id = w.project_id
    WHERE w.staff_id = $1
    ORDER BY w.work_date DESC, w.created_at DESC
    LIMIT 6;
  `, [staffId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {session.fullName || 'Team Member'}!
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Your Personal Productivity & Attendance Dashboard &mdash; {formatKolkataDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Staff Personal Monthly Target & Goal Achievement Card */}
      <StaffPersonalTargetCard
        staffName={personalData.full_name || session.fullName || 'You'}
        targetPoints={targetPoints}
        approvedPoints={approvedPoints}
        pendingPoints={pendingPoints}
        monthName={monthName}
      />

      {/* Staff Personal 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* 1. My Approved Points */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved Points</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatPoints(approvedPoints)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">
                Goal: <strong className="text-slate-700">{formatPoints(targetPoints)} pts</strong>
              </span>
              <span className={`font-bold ${performancePercent >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {performancePercent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Pending Approvals */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending Review</p>
                <p className={`text-3xl font-bold mt-1 ${pendingPoints > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {formatPoints(pendingPoints)} <span className="text-sm font-normal text-slate-400">pts</span>
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pendingPoints > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-500">
              {pendingCount > 0 ? (
                <span className="text-amber-700 font-medium">{pendingCount} submission(s) in review</span>
              ) : (
                <span className="text-slate-400">All submissions reviewed</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. My Attendance (This Month) */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Present ({monthShort})</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{personalAtt.present_count || 0} <span className="text-sm font-normal text-slate-400">Days</span></p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="text-amber-600 font-semibold">HD: {personalAtt.half_day_count || 0}</span>
              <span>·</span>
              <span className="text-blue-600 font-semibold">Lv: {personalAtt.leave_count || 0}</span>
              <span>·</span>
              <span className="text-red-500 font-semibold">Abs: {personalAtt.absent_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. My Assigned Tasks */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">My Active Tasks</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{personalTaskSummary.total_count || 0}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              {parseInt(personalTaskSummary.overdue_count || '0', 10) > 0 ? (
                <span className="text-red-600 font-bold">{personalTaskSummary.overdue_count} overdue task(s)</span>
              ) : (
                <span className="text-emerald-600 font-medium">On track</span>
              )}
              <Link href="/tasks" className="text-amber-600 hover:underline font-semibold">
                Tasks →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Shoots Today (if any) */}
      {personalShootsRes.rows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-amber-700" />
            <h3 className="text-sm font-bold text-amber-900">Your Scheduled Shoots Today ({personalShootsRes.rows.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {personalShootsRes.rows.map((shoot: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 px-3 py-2 shadow-sm text-xs">
                <Badge variant="outline" className="text-[10px] font-bold border-amber-400 text-amber-800">{shoot.role}</Badge>
                <span className="font-bold text-slate-900">{shoot.project_name}</span>
                <span className="text-slate-400">&mdash;</span>
                <span className="text-slate-600">{shoot.event_type}</span>
                <span className="text-slate-400">&mdash;</span>
                <span className="text-slate-600">{shoot.location}</span>
                {shoot.is_out_of_station && (
                  <Badge variant="warning" className="text-[10px]">Out-of-Station</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts & Assigned Tasks Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Personal 6-Month Points Chart */}
        <div className="xl:col-span-2">
          <DashboardCharts
            chartData={personalChartData}
            title="My Monthly Productivity Points"
            description="Your personal approved points breakdown — last 6 months"
          />
        </div>

        {/* My Assigned Tasks Widget */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">My Assigned Tasks</h3>
            </div>
            <Link href="/tasks" className="text-[11px] font-semibold text-amber-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {personalTasksRes.rows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                You have no pending tasks! Great work.
              </div>
            ) : (
              personalTasksRes.rows.map((task: any) => (
                <div key={task.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{task.task_type}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {task.project_name || 'Studio Task'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {task.is_overdue && (
                        <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                      )}
                      <Badge
                        variant={task.priority === 'Urgent' ? 'destructive' : task.priority === 'High' ? 'warning' : 'secondary'}
                        className="text-[10px]"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  {task.deadline && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Due: {formatKolkataDate(task.deadline)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Staff Personal Recent Work Entries */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Recent Work Submissions</h3>
              <p className="text-[11px] text-slate-500">Your recent logged work entries and verification status</p>
            </div>
          </div>
          <Link
            href="/work-register"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors self-start sm:self-auto"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Submit Work Entry
          </Link>
        </div>

        {personalWorkEntriesRes.rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No work entries logged yet this month</p>
            <p className="mt-1">Click &ldquo;Submit Work Entry&rdquo; to log your photo edits, video edits, or shoot events.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 text-[11px]">
                  <TableHead className="font-semibold text-slate-600">Date</TableHead>
                  <TableHead className="font-semibold text-slate-600">Work Type & Project</TableHead>
                  <TableHead className="font-semibold text-slate-600">Quantity / Duration</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Points</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">Remarks / Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personalWorkEntriesRes.rows.map((entry: any) => (
                  <TableRow key={entry.id} className="text-xs hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-800 whitespace-nowrap">
                      {formatKolkataDate(entry.work_date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{entry.work_type}</div>
                      {entry.project_name && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{entry.project_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {parseFloat(entry.quantity_or_duration || '1')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600">
                      {formatPoints(entry.total_points)} pts
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge
                        variant={
                          entry.status === 'Approved'
                            ? 'success'
                            : entry.status === 'Rejected'
                            ? 'destructive'
                            : 'warning'
                        }
                        className="text-[10px]"
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-[11px] max-w-[240px] truncate">
                      {entry.rejection_reason ? (
                        <span className="text-red-600 font-medium">{entry.rejection_reason}</span>
                      ) : (
                        entry.remarks || '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
