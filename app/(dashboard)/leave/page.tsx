import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { LeaveManagementView } from '@/components/leave/leave-management-view';

export const metadata = {
  title: 'Leave Management — Studio GFX Photography',
};

export default async function LeavePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin';

  // Automatically clean up any legacy duplicate pending leave requests on the same overlapping dates (keep the latest)
  try {
    await query(`
      DELETE FROM leave_requests a
      USING leave_requests b
      WHERE a.staff_id = b.staff_id
        AND a.status = 'Pending'
        AND b.status = 'Pending'
        AND a.start_date <= b.end_date
        AND a.end_date >= b.start_date
        AND a.id <> b.id
        AND a.created_at < b.created_at;
    `);
  } catch (e) {
    // Graceful fallback if table is locked
  }

  let leaveQuery = `
    SELECT 
      lr.id,
      lr.leave_type,
      lr.start_date::text,
      lr.end_date::text,
      lr.reason,
      lr.status,
      lr.rejection_reason,
      lr.created_at::text,
      s.id AS staff_id,
      s.full_name AS staff_name,
      s.staff_code,
      s.designation,
      (lr.end_date - lr.start_date + 1) AS days_count
    FROM leave_requests lr
    JOIN staff s ON s.id = lr.staff_id
  `;
  const params: any[] = [];

  if (!isAdmin && session.staffId) {
    leaveQuery += ' WHERE lr.staff_id = $1';
    params.push(session.staffId);
  }

  leaveQuery += ' ORDER BY lr.created_at DESC;';

  const leaveRes = await query(leaveQuery, params);

  let staffOptions: any[] = [];
  if (isAdmin) {
    const staffRes = await query(
      'SELECT id, staff_code, full_name FROM staff WHERE is_active = true ORDER BY staff_code;'
    );
    staffOptions = staffRes.rows;
  }

  return (
    <LeaveManagementView
      leaveRequests={leaveRes.rows}
      staffOptions={staffOptions}
      isAdmin={isAdmin}
      currentStaffId={session.staffId}
    />
  );
}
