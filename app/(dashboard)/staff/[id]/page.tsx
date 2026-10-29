import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  CalendarCheck,
  Shield,
  User,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProfileTargetButton } from '@/components/staff/profile-target-button';
import { formatKolkataDate, formatPoints } from '@/lib/utils';
import { formatMinutes } from '@/lib/attendance/timing';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffProfilePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Staff Isolation Security Check:
  // Non-admins can only view their own staff profile!
  if (session.role !== 'admin' && session.staffId !== id) {
    redirect('/dashboard');
  }

  // 1. Fetch Staff Details
  const staffRes = await query(
    `
    SELECT 
      s.id,
      s.user_id,
      s.staff_code,
      s.full_name,
      s.phone,
      s.email,
      s.designation,
      s.joining_date::text,
      s.is_active,
      s.notes,
      u.email AS user_email,
      u.role AS user_role
    FROM staff s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.id = $1;
    `,
    [id]
  );

  if (staffRes.rows.length === 0) {
    notFound();
  }

  const staff = staffRes.rows[0];

  // 2. Query Performance / Points Statistics
  const pointsRes = await query(
    `
    SELECT 
      COALESCE(SUM(total_points) FILTER (WHERE status = 'Approved'), 0) AS total_approved_points,
      COALESCE(SUM(total_points) FILTER (WHERE status = 'Submitted'), 0) AS total_pending_points,
      COALESCE(SUM(bonus_points) FILTER (WHERE status = 'Approved'), 0) AS total_bonus_points,
      COALESCE(SUM(quantity_or_duration) FILTER (WHERE status = 'Approved' AND work_type = 'Album Photo Edit'), 0) AS total_album_sheets,
      COALESCE(SUM(quantity_or_duration) FILTER (WHERE status = 'Approved' AND work_type = 'Video Edit'), 0) AS total_video_hours,
      COUNT(*) FILTER (WHERE status = 'Approved' AND work_type LIKE '%Shoot') AS total_shoots
    FROM work_entries
    WHERE staff_id = $1;
    `,
    [id]
  );
  const pointsStats = pointsRes.rows[0];

  // 3. Query Attendance Statistics (Current Month)
  const attendanceRes = await query(
    `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'Present') AS present_count,
      COUNT(*) FILTER (WHERE status = 'Half Day') AS half_day_count,
      COUNT(*) FILTER (WHERE status = 'Absent') AS absent_count,
      COUNT(*) FILTER (WHERE status = 'Leave') AS leave_count,
      COALESCE(SUM(total_working_minutes), 0) AS total_working_minutes,
      COALESCE(SUM(overtime_minutes), 0) AS total_overtime_minutes
    FROM attendance
    WHERE staff_id = $1 AND date >= date_trunc('month', CURRENT_DATE);
    `,
    [id]
  );
  const attendanceStats = attendanceRes.rows[0];

  // 4. Query Recent Work Entries
  const recentWorkRes = await query(
    `
    SELECT 
      w.id,
      w.work_date::text,
      w.work_type,
      w.quantity_or_duration,
      w.total_points,
      w.status,
      w.remarks,
      p.project_name
    FROM work_entries w
    LEFT JOIN projects p ON p.id = w.project_id
    WHERE w.staff_id = $1
    ORDER BY w.work_date DESC
    LIMIT 10;
    `,
    [id]
  );

  // 5. Query Recent Attendance Records
  const recentAttendanceRes = await query(
    `
    SELECT 
      date::text,
      status,
      first_half_check_in,
      first_half_check_out,
      second_half_check_in,
      second_half_check_out,
      total_working_minutes,
      overtime_minutes,
      is_late_arrival
    FROM attendance
    WHERE staff_id = $1
    ORDER BY date DESC
    LIMIT 10;
    `,
    [id]
  );

  // 6. Query Current Month Target and Performance
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const targetRes = await query(
    `
    SELECT 
      COALESCE(smt.target_points, s.monthly_target_points, 150.00)::numeric AS current_target_points
    FROM staff s
    LEFT JOIN staff_monthly_targets smt ON smt.staff_id = s.id 
      AND smt.year = $2 AND smt.month = $3
    WHERE s.id = $1;
    `,
    [id, currentYear, currentMonth]
  );
  const currentTargetPoints = parseFloat(targetRes.rows[0]?.current_target_points || '150');

  const monthWorkRes = await query(
    `
    SELECT 
      COALESCE(SUM(total_points) FILTER (WHERE status = 'Approved'), 0)::numeric AS month_approved_points,
      COALESCE(SUM(total_points) FILTER (WHERE status = 'Submitted'), 0)::numeric AS month_pending_points
    FROM work_entries
    WHERE staff_id = $1 AND work_date >= date_trunc('month', CURRENT_DATE);
    `,
    [id]
  );
  const monthApprovedPoints = parseFloat(monthWorkRes.rows[0]?.month_approved_points || '0');
  const monthPendingPoints = parseFloat(monthWorkRes.rows[0]?.month_pending_points || '0');
  const performancePercent = currentTargetPoints > 0 ? (monthApprovedPoints / currentTargetPoints) * 100 : 0;
  const isTargetAchieved = performancePercent >= 100;
  const visualProgress = Math.min(Math.max(performancePercent, 0), 100);

  // 7. Query Month-Wise Target & Achievement History (last 6 months)
  const historyRes = await query(
    `
    WITH months AS (
      SELECT 
        EXTRACT(YEAR FROM m)::int AS y,
        EXTRACT(MONTH FROM m)::int AS m_num,
        TO_CHAR(m, 'Mon YYYY') AS label,
        m::date AS start_date
      FROM generate_series(
        date_trunc('month', CURRENT_DATE) - interval '5 months',
        date_trunc('month', CURRENT_DATE),
        interval '1 month'
      ) m
    )
    SELECT 
      months.y,
      months.m_num,
      months.label,
      COALESCE(smt.target_points, s.monthly_target_points, 150.00)::numeric AS target_points,
      smt.notes AS month_notes,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved'), 0)::numeric AS approved_points,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Submitted'), 0)::numeric AS pending_points,
      COUNT(w.id) FILTER (WHERE w.status = 'Approved') AS total_approved_entries
    FROM months
    CROSS JOIN staff s
    LEFT JOIN staff_monthly_targets smt ON smt.staff_id = s.id 
      AND smt.year = months.y AND smt.month = months.m_num
    LEFT JOIN work_entries w ON w.staff_id = s.id 
      AND w.work_date >= months.start_date 
      AND w.work_date < (months.start_date + interval '1 month')
    WHERE s.id = $1
    GROUP BY months.y, months.m_num, months.label, months.start_date, smt.target_points, smt.notes, s.monthly_target_points
    ORDER BY months.start_date DESC;
    `,
    [id]
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {session.role === 'admin' && (
        <Link
          href="/staff"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff Directory
        </Link>
      )}

      {/* Staff Profile Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-amber-400 font-bold text-xl shadow-md">
              {staff.full_name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{staff.full_name}</h1>
                <Badge variant={staff.is_active ? 'success' : 'destructive'}>
                  {staff.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {staff.staff_code}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-800">{staff.designation}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Joined {formatKolkataDate(staff.joining_date)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                <span>{staff.email}</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Phone className="h-3.5 w-3.5" />
                <span>{staff.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {staff.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Skills / Notes: </span>
            {staff.notes}
          </div>
        )}
      </div>

      {/* Monthly Target & Performance Card */}
      <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {monthName} Monthly Target & Performance
                </h3>
                <p className="text-xs text-slate-500">
                  Goal assigned by Studio Management for productivity tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium block">Performance</span>
              <span
                className={`text-2xl font-black ${
                  isTargetAchieved ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {performancePercent.toFixed(1)}%
              </span>
            </div>
            {session.role === 'admin' && (
              <ProfileTargetButton
                staffId={staff.id}
                fullName={staff.full_name}
                staffCode={staff.staff_code}
                currentTarget={currentTargetPoints}
              />
            )}
          </div>
        </div>

        {/* Progress Bar & Details */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Achieved: <span className="text-amber-700 font-bold">{formatPoints(monthApprovedPoints)} pts</span> of{' '}
              <span className="font-bold text-slate-900">{formatPoints(currentTargetPoints)} pts</span> target
            </span>
            <span className="text-slate-500 font-medium">
              {isTargetAchieved ? (
                <span className="text-emerald-700 font-bold">
                  Target Achieved (+{(monthApprovedPoints - currentTargetPoints).toFixed(1)} pts)
                </span>
              ) : (
                <span>
                  {(currentTargetPoints - monthApprovedPoints > 0 ? currentTargetPoints - monthApprovedPoints : 0).toFixed(1)} pts remaining
                </span>
              )}
            </span>
          </div>

          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isTargetAchieved
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600'
              }`}
              style={{ width: `${visualProgress}%` }}
            />
          </div>

          {monthPendingPoints > 0 && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>
                Pending review: <strong className="text-amber-700">{formatPoints(monthPendingPoints)} pts</strong>
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Approved Points</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {formatPoints(pointsStats.total_approved_points)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">
              Pending: {formatPoints(pointsStats.total_pending_points)} pts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Bonus Points</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {formatPoints(pointsStats.total_bonus_points)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Late-night & Out-of-station</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Month Attendance</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {attendanceStats.present_count} <span className="text-sm font-normal text-slate-500">days</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">
              Half Days: {attendanceStats.half_day_count} | Absent: {attendanceStats.absent_count}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Working Duration</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {formatMinutes(parseInt(attendanceStats.total_working_minutes, 10))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">
              Overtime: {formatMinutes(parseInt(attendanceStats.total_overtime_minutes, 10))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row: Recent Work and Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Register */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Work Register</h3>
            </div>
            <Link
              href={`/work-register?staff=${staff.id}`}
              className="text-xs font-semibold text-amber-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Work / Project</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentWorkRes.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-xs text-slate-400">
                    No work entries recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentWorkRes.rows.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-xs text-slate-600">
                      {formatKolkataDate(w.work_date)}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-semibold text-slate-900">{w.work_type}</p>
                      {w.project_name && (
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{w.project_name}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs text-slate-900">
                      {formatPoints(w.total_points)}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Recent Attendance */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Attendance</h3>
            </div>
            <Link
              href={`/attendance?staff=${staff.id}`}
              className="text-xs font-semibold text-amber-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Punches</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAttendanceRes.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-xs text-slate-400">
                    No attendance records for this period.
                  </TableCell>
                </TableRow>
              ) : (
                recentAttendanceRes.rows.map((att: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-slate-600">
                      {formatKolkataDate(att.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          att.status === 'Present'
                            ? 'success'
                            : att.status === 'Half Day'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {att.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {att.first_half_check_in
                        ? `${att.first_half_check_in.substring(0, 5)} - ${att.first_half_check_out ? att.first_half_check_out.substring(0, 5) : '...'}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-slate-900">
                      {formatMinutes(att.total_working_minutes)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Month-Wise Productivity Targets & Historical Performance */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Month-Wise Productivity Targets & Performance
              </h3>
              <p className="text-[11px] text-slate-500">
                Customizable monthly goals & achievement history across seasons
              </p>
            </div>
          </div>
          {session.role === 'admin' && (
            <ProfileTargetButton
              staffId={staff.id}
              fullName={staff.full_name}
              staffCode={staff.staff_code}
              currentTarget={currentTargetPoints}
              label="Set Any Month Target"
            />
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 text-xs">
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Target Assigned</TableHead>
              <TableHead className="text-right">Approved Points</TableHead>
              <TableHead className="min-w-[170px]">Performance Achievement</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Entries</TableHead>
              {session.role === 'admin' && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyRes.rows.map((row: any, i: number) => {
              const target = parseFloat(row.target_points || '150');
              const approved = parseFloat(row.approved_points || '0');
              const percent = target > 0 ? (approved / target) * 100 : 0;
              const isAchieved = percent >= 100;
              const visualProg = Math.min(Math.max(percent, 0), 100);

              return (
                <TableRow key={i} className="text-xs hover:bg-slate-50/60">
                  <TableCell className="font-bold text-slate-900">
                    {row.label}
                    {row.month_notes && (
                      <span className="block text-[10px] text-slate-400 font-normal italic">
                        {row.month_notes}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-800">
                    {formatPoints(target)} <span className="text-[10px] text-slate-400">pts</span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-600">
                    {formatPoints(approved)} <span className="text-[10px] text-slate-400">pts</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-xs ${
                            isAchieved ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {percent.toFixed(1)}%
                        </span>
                        <Badge
                          variant={isAchieved ? 'default' : 'warning'}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {isAchieved
                            ? 'Achieved'
                            : `${(target - approved > 0 ? target - approved : 0).toFixed(0)} pts left`}
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isAchieved ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${visualProg}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {row.pending_points > 0 ? `+${formatPoints(row.pending_points)} pts` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-700">
                    {row.total_approved_entries}
                  </TableCell>
                  {session.role === 'admin' && (
                    <TableCell className="text-right">
                      <ProfileTargetButton
                        staffId={staff.id}
                        fullName={staff.full_name}
                        staffCode={staff.staff_code}
                        currentTarget={target}
                        year={row.y}
                        month={row.m_num}
                        label="Change"
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

