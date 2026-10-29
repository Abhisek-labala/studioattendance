import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { PunchCard } from '@/components/attendance/punch-card';
import { RegisterView } from '@/components/attendance/register-view';
import { CorrectionsReview } from '@/components/attendance/corrections-review';

interface PageProps {
  searchParams: Promise<{
    staff?: string;
    month?: string;
    year?: string;
  }>;
}

export const metadata = {
  title: 'Attendance Register — Studio GFX Photography',
};

export default async function AttendancePage({ searchParams }: PageProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const sp = await searchParams;
  const now = new Date();
  const currentYear = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const currentMonth = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;

  // 1. Determine Target Staff ID
  let targetStaffId = session.staffId;
  let allStaff: any[] = [];

  if (session.role === 'admin') {
    const staffRes = await query(
      'SELECT id, staff_code, full_name, designation FROM staff WHERE is_active = true ORDER BY staff_code ASC;'
    );
    allStaff = staffRes.rows;

    if (sp.staff) {
      targetStaffId = sp.staff;
    } else if (!targetStaffId && allStaff.length > 0) {
      targetStaffId = allStaff[0].id;
    }
  }

  if (!targetStaffId) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active staff profile linked to your account.
      </div>
    );
  }

  // 2. Fetch Selected Staff Info
  const targetStaffRes = await query(
    'SELECT id, staff_code, full_name, designation FROM staff WHERE id = $1;',
    [targetStaffId]
  );
  const targetStaff = targetStaffRes.rows[0] || {
    id: targetStaffId,
    staff_code: 'GFX-001',
    full_name: session.fullName || session.email,
    designation: 'Staff',
  };

  // 3. Fetch Attendance Records for the target month
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const recordsRes = await query(
    `
    SELECT 
      id,
      date::text,
      status,
      first_half_check_in,
      first_half_check_out,
      second_half_check_in,
      second_half_check_out,
      first_half_check_in_at::text,
      first_half_check_out_at::text,
      second_half_check_in_at::text,
      second_half_check_out_at::text,
      first_half_in_location,
      first_half_out_location,
      second_half_in_location,
      second_half_out_location,
      total_working_minutes,
      overtime_minutes,
      is_late_arrival,
      remarks
    FROM attendance
    WHERE staff_id = $1 
      AND date >= $2::date 
      AND date < ($2::date + interval '1 month')
    ORDER BY date ASC;
    `,
    [targetStaffId, startDate]
  );

  // 4. Fetch Today's Record in Asia/Kolkata timezone
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const todayRes = await query(
    'SELECT * FROM attendance WHERE staff_id = $1 AND date = $2;',
    [targetStaffId, todayStr]
  );
  const todayRecord = todayRes.rows[0] || null;

  // 5. If Admin, Fetch Pending Corrections
  let pendingCorrections: any[] = [];
  if (session.role === 'admin') {
    const corrRes = await query(
      `
      SELECT 
        c.id,
        c.attendance_id,
        s.full_name AS staff_name,
        s.staff_code,
        a.date::text,
        a.status AS current_status,
        c.proposed_status,
        c.proposed_first_half_in,
        c.proposed_first_half_out,
        c.proposed_second_half_in,
        c.proposed_second_half_out,
        c.reason,
        c.created_at::text
      FROM attendance_corrections c
      JOIN attendance a ON a.id = c.attendance_id
      JOIN staff s ON s.id = a.staff_id
      WHERE c.status = 'Pending'
      ORDER BY c.created_at ASC;
      `
    );
    pendingCorrections = corrRes.rows;
  }

  return (
    <div className="space-y-6">
      {/* Admin Month & Staff Switcher Bar */}
      {session.role === 'admin' && (
        <div className="no-print bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <form method="GET" className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Staff Member:</span>
              <select
                name="staff"
                defaultValue={targetStaffId}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
              >
                {allStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.staff_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Month:</span>
              <select
                name="month"
                defaultValue={currentMonth}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1).toLocaleString('default', { month: 'short' })}
                  </option>
                ))}
              </select>

              <select
                name="year"
                defaultValue={currentYear}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="h-8 rounded bg-slate-900 px-3 text-white font-medium hover:bg-slate-800"
              >
                View Register
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daily Punch Card — Displayed only for Staff members to record their attendance (Admin cannot take attendance) */}
      {session.role !== 'admin' && (
        <div className="no-print">
          <PunchCard
            currentStaffId={targetStaffId}
            staffName={targetStaff.full_name}
            todayRecord={todayRecord}
            isAdmin={false}
            staffOptions={allStaff}
          />
        </div>
      )}

      {/* Admin Pending Corrections Section */}
      {session.role === 'admin' && pendingCorrections.length > 0 && (
        <div className="no-print">
          <CorrectionsReview requests={pendingCorrections} />
        </div>
      )}

      {/* Studio GFX Paper Register Component */}
      <RegisterView
        year={currentYear}
        month={currentMonth}
        staff={targetStaff}
        records={recordsRes.rows}
        isStaffViewingOwn={session.staffId === targetStaffId}
      />
    </div>
  );
}

