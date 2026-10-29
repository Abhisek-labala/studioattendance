import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { ReportsView } from '@/components/reports/reports-view';

interface PageProps {
  searchParams: Promise<{
    staff?: string;
    month?: string;
    year?: string;
    type?: string;
  }>;
}

export const metadata = {
  title: 'Reports & Exports — Studio GFX Photography',
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin';
  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;

  // Staff scope
  let targetStaffId: string | null = isAdmin ? (sp.staff || null) : (session.staffId || null);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  // 1. Fetch available staff
  const staffRes = await query('SELECT id, staff_code, full_name, designation FROM staff WHERE is_active = true ORDER BY staff_code;');
  const staffOptions = staffRes.rows;

  // 2. Monthly performance report (per staff or selected staff)
  let performanceQuery = `
    SELECT 
      s.id,
      s.full_name,
      s.staff_code,
      s.designation,
      COALESCE(smt.target_points, s.monthly_target_points, 150.00)::numeric AS target_points,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved'), 0)::numeric AS approved_points,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Submitted'), 0)::numeric AS pending_points,
      COALESCE(SUM(w.base_points) FILTER (WHERE w.status = 'Approved' AND w.work_type LIKE '%Shoot'), 0)::numeric AS shoot_base,
      COALESCE(SUM(w.bonus_points) FILTER (WHERE w.status = 'Approved'), 0)::numeric AS total_bonuses,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved' AND w.work_type = 'Album Photo Edit'), 0)::numeric AS album_edit_points,
      COALESCE(SUM(w.quantity_or_duration) FILTER (WHERE w.status = 'Approved' AND w.work_type = 'Album Photo Edit'), 0)::numeric AS album_sheets,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved' AND w.work_type = 'Video Edit'), 0)::numeric AS video_edit_points,
      COALESCE(SUM(w.quantity_or_duration) FILTER (WHERE w.status = 'Approved' AND w.work_type = 'Video Edit'), 0)::numeric AS video_hours,
      COALESCE(SUM(w.bonus_points) FILTER (WHERE w.status = 'Approved' AND w.is_late_night = true), 0)::numeric AS late_night_bonus,
      COALESCE(SUM(w.bonus_points) FILTER (WHERE w.status = 'Approved' AND w.is_out_of_station = true), 0)::numeric AS out_of_station_bonus,
      COUNT(w.id) FILTER (WHERE w.status = 'Approved' AND w.work_type LIKE '%Shoot') AS total_shoots
    FROM staff s
    LEFT JOIN staff_monthly_targets smt ON smt.staff_id = s.id AND smt.year = $2 AND smt.month = $3
    LEFT JOIN work_entries w ON w.staff_id = s.id AND w.work_date >= $1 AND w.work_date < ($1::date + interval '1 month')
    WHERE s.is_active = true
  `;
  const perfParams: any[] = [monthStart, year, month];

  if (targetStaffId) {
    performanceQuery += ' AND s.id = $4';
    perfParams.push(targetStaffId);
  }

  performanceQuery += ' GROUP BY s.id, s.full_name, s.staff_code, s.designation, smt.target_points, s.monthly_target_points ORDER BY approved_points DESC;';

  const perfRes = await query(performanceQuery, perfParams);

  // 3. Attendance summary for the month
  let attQuery = `
    SELECT 
      s.full_name, s.staff_code,
      COUNT(*) FILTER (WHERE a.status = 'Present') AS present_days,
      COUNT(*) FILTER (WHERE a.status = 'Half Day') AS half_days,
      COUNT(*) FILTER (WHERE a.status = 'Absent') AS absent_days,
      COUNT(*) FILTER (WHERE a.status = 'Leave') AS leave_days,
      COUNT(*) FILTER (WHERE a.status = 'Weekly Off') AS weekly_off,
      COALESCE(SUM(a.total_working_minutes), 0) AS total_minutes,
      COALESCE(SUM(a.overtime_minutes), 0) AS overtime_minutes
    FROM staff s
    LEFT JOIN attendance a ON a.staff_id = s.id 
      AND a.date >= $1 AND a.date < ($1::date + interval '1 month')
    WHERE s.is_active = true
  `;
  const attParams: any[] = [monthStart];

  if (targetStaffId) {
    attQuery += ' AND s.id = $2';
    attParams.push(targetStaffId);
  }

  attQuery += ' GROUP BY s.id, s.full_name, s.staff_code ORDER BY s.staff_code;';

  const attRes = await query(attQuery, attParams);

  return (
    <ReportsView
      year={year}
      month={month}
      staffOptions={staffOptions}
      selectedStaffId={targetStaffId}
      performanceData={perfRes.rows.map(r => ({
        ...r,
        approved_points: parseFloat(r.approved_points),
        pending_points: parseFloat(r.pending_points),
        total_bonuses: parseFloat(r.total_bonuses),
        album_edit_points: parseFloat(r.album_edit_points),
        album_sheets: parseFloat(r.album_sheets),
        video_edit_points: parseFloat(r.video_edit_points),
        video_hours: parseFloat(r.video_hours),
        late_night_bonus: parseFloat(r.late_night_bonus),
        out_of_station_bonus: parseFloat(r.out_of_station_bonus),
      }))}
      attendanceData={attRes.rows.map(r => ({
        ...r,
        total_minutes: parseInt(r.total_minutes, 10),
        overtime_minutes: parseInt(r.overtime_minutes, 10),
      }))}
      isAdmin={isAdmin}
    />
  );
}

