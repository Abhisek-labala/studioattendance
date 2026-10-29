import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { StaffDirectoryView } from '@/components/staff/staff-directory-view';

export const metadata = {
  title: 'Staff Management — Studio GFX Photography',
};

export default async function StaffPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Only Admin can manage staff directory
  if (session.role !== 'admin') {
    redirect('/dashboard');
  }

  const staffResult = await query(
    `
    SELECT 
      s.id,
      s.staff_code,
      s.full_name,
      s.phone,
      s.email,
      s.designation,
      s.joining_date::text,
      s.is_active,
      s.notes,
      COALESCE(smt.target_points, s.monthly_target_points, 150.00)::numeric AS current_target_points,
      (s.user_id IS NOT NULL) AS has_user_account,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved'), 0) AS total_approved_points,
      COALESCE(SUM(w.total_points) FILTER (WHERE w.status = 'Approved' AND w.work_date >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS month_approved_points
    FROM staff s
    LEFT JOIN staff_monthly_targets smt ON smt.staff_id = s.id 
      AND smt.year = EXTRACT(YEAR FROM CURRENT_DATE)::int 
      AND smt.month = EXTRACT(MONTH FROM CURRENT_DATE)::int
    LEFT JOIN work_entries w ON w.staff_id = s.id
    GROUP BY s.id, smt.target_points, s.monthly_target_points
    ORDER BY s.staff_code ASC;
    `
  );

  return (
    <StaffDirectoryView
      staffList={staffResult.rows}
      isAdmin={session.role === 'admin'}
    />
  );
}

