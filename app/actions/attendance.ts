'use server';

import { revalidatePath } from 'next/cache';
import { query, withTransaction } from '@/db/pool';
import { getSession } from '@/lib/auth/session';
import { attendanceSchema, attendanceCorrectionSchema } from '@/lib/validation/schemas';
import { calculateAttendanceTiming } from '@/lib/attendance/timing';
import { reverseGeocodeCoordinates } from '@/lib/attendance/geolocation';
import { logAuditEvent } from '@/lib/audit/logger';
import { createNotification, notifyAdmins } from '@/lib/notifications/notify';

export interface AttendanceActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: { [key: string]: string[] };
}

export interface PunchShiftResult {
  success: boolean;
  error?: string;
  record?: any;
}

/**
 * Biometric & GPS Shift Punch Action
 * Strictly enforces Today's Date in Asia/Kolkata timezone with exact timestamp and geolocation
 */
export async function punchShiftAction(
  punchType: 'morning_in' | 'morning_out' | 'evening_in' | 'evening_out',
  payload: {
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    locationName?: string | null;
    remarks?: string | null;
  } = {}
): Promise<PunchShiftResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  // Rule: Admin can view attendance details and reports, but admin cannot record daily attendance punches
  if (session.role === 'admin') {
    return {
      success: false,
      error: 'Administrators cannot record daily attendance. Attendance punches must be submitted by staff members.',
    };
  }

  const staffId = session.staffId;
  if (!staffId) {
    return { success: false, error: 'Valid staff identity could not be verified.' };
  }

  // Strictly enforce Today's Date in Asia/Kolkata timezone - NO ONE CAN CHANGE THE DATE
  const now = new Date();
  const kolkataDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // "YYYY-MM-DD"

  const kolkataTimeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now); // "HH:MM:SS"

  const punchTimestamp = now.toISOString();

  // Location string formatting with exact address & coordinates
  let locationStr = 'Location unavailable';
  if (payload.locationName && payload.locationName.trim()) {
    locationStr = payload.locationName.trim();
  } else if (payload.latitude != null && payload.longitude != null) {
    const latFormatted = `${Math.abs(payload.latitude).toFixed(6)}° ${payload.latitude >= 0 ? 'N' : 'S'}`;
    const lngFormatted = `${Math.abs(payload.longitude).toFixed(6)}° ${payload.longitude >= 0 ? 'E' : 'W'}`;
    const acc = payload.accuracy ? ` (±${Math.round(payload.accuracy)}m)` : '';

    try {
      const geo = await reverseGeocodeCoordinates(payload.latitude, payload.longitude);
      if (geo.fullAddress && geo.fullAddress !== `${latFormatted}, ${lngFormatted}`) {
        locationStr = `${geo.fullAddress} [${latFormatted}, ${lngFormatted}${acc}]`;
      } else {
        locationStr = `${latFormatted}, ${lngFormatted}${acc}`;
      }
    } catch {
      locationStr = `${latFormatted}, ${lngFormatted}${acc}`;
    }
  }

  // Retrieve studio settings for timing thresholds
  let graceMinutes = 15;
  let fullDayMinutes = 480;
  let overtimeMinutes = 510;
  try {
    const settingsRes = await query('SELECT * FROM studio_settings WHERE id = $1;', ['default']);
    if (settingsRes.rows.length > 0) {
      const s = settingsRes.rows[0];
      graceMinutes = s.late_grace_period_minutes;
      fullDayMinutes = s.full_day_minimum_minutes;
      overtimeMinutes = s.overtime_threshold_minutes;
    }
  } catch (e) {
    // default fallbacks
  }

  try {
    // Check if record already exists for this staff member and today's date
    const existingRes = await query(
      'SELECT * FROM attendance WHERE staff_id = $1 AND date = $2;',
      [staffId, kolkataDateStr]
    );
    const existing = existingRes.rows[0] || null;

    let fIn = existing?.first_half_check_in || null;
    let fOut = existing?.first_half_check_out || null;
    let sIn = existing?.second_half_check_in || null;
    let sOut = existing?.second_half_check_out || null;

    let fInAt = existing?.first_half_check_in_at || null;
    let fOutAt = existing?.first_half_check_out_at || null;
    let sInAt = existing?.second_half_check_in_at || null;
    let sOutAt = existing?.second_half_check_out_at || null;

    let fInLoc = existing?.first_half_in_location || null;
    let fOutLoc = existing?.first_half_out_location || null;
    let sInLoc = existing?.second_half_in_location || null;
    let sOutLoc = existing?.second_half_out_location || null;

    // Validate shift sequence and buffer timing
    if (punchType === 'morning_out') {
      if (!fIn) {
        return {
          success: false,
          error: 'Morning Login must be recorded before punching Morning Logout.',
        };
      }
    }

    if (punchType === 'evening_in') {
      // Rule 1: Cannot login to Evening Shift before Morning Logout if Morning Login was punched
      if (fIn && !fOut) {
        return {
          success: false,
          error: 'Cannot login to Evening Shift before completing Morning Logout. Please punch Morning Logout first.',
        };
      }

      // Rule 2: Evening shift starts at 02:30 PM with 1-hr buffer -> Allowed from 01:30 PM onwards
      const kolkataDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const currentMinutesFromMidnight = kolkataDate.getHours() * 60 + kolkataDate.getMinutes();
      const eveningBufferStartMinutes = 13 * 60 + 30; // 810 minutes (01:30 PM)

      if (currentMinutesFromMidnight < eveningBufferStartMinutes) {
        return {
          success: false,
          error: 'Evening Shift Login is only permitted after 01:30 PM (1 hour buffer before scheduled 02:30 PM start).',
        };
      }
    }

    if (punchType === 'evening_out') {
      if (!sIn) {
        return {
          success: false,
          error: 'Evening Login must be recorded before punching Evening Logout.',
        };
      }
    }

    if (punchType === 'morning_in') {
      fIn = kolkataTimeStr;
      fInAt = punchTimestamp;
      fInLoc = locationStr;
    } else if (punchType === 'morning_out') {
      fOut = kolkataTimeStr;
      fOutAt = punchTimestamp;
      fOutLoc = locationStr;
    } else if (punchType === 'evening_in') {
      sIn = kolkataTimeStr;
      sInAt = punchTimestamp;
      sInLoc = locationStr;
    } else if (punchType === 'evening_out') {
      sOut = kolkataTimeStr;
      sOutAt = punchTimestamp;
      sOutLoc = locationStr;
    }

    // Calculate timing & durations
    const timing = calculateAttendanceTiming({
      status: existing?.status === 'Leave' || existing?.status === 'Absent' ? 'Present' : (existing?.status || 'Present'),
      firstHalfIn: fIn,
      firstHalfOut: fOut,
      secondHalfIn: sIn,
      secondHalfOut: sOut,
      gracePeriodMinutes: graceMinutes,
      fullDayThresholdMinutes: fullDayMinutes,
      overtimeThresholdMinutes: overtimeMinutes,
    });

    let savedRecord: any;

    if (existing) {
      const updateRes = await query(
        `
        UPDATE attendance
        SET
          first_half_check_in = $1,
          first_half_check_in_at = $2,
          first_half_in_location = $3,
          first_half_check_out = $4,
          first_half_check_out_at = $5,
          first_half_out_location = $6,
          second_half_check_in = $7,
          second_half_check_in_at = $8,
          second_half_in_location = $9,
          second_half_check_out = $10,
          second_half_check_out_at = $11,
          second_half_out_location = $12,
          total_working_minutes = $13,
          overtime_minutes = $14,
          is_late_arrival = $15,
          status = $16,
          remarks = COALESCE($17, remarks),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $18
        RETURNING *;
        `,
        [
          fIn, fInAt, fInLoc,
          fOut, fOutAt, fOutLoc,
          sIn, sInAt, sInLoc,
          sOut, sOutAt, sOutLoc,
          timing.totalWorkingMinutes,
          timing.overtimeMinutes,
          timing.isLateArrival,
          timing.computedStatus,
          payload.remarks?.trim() || null,
          existing.id,
        ]
      );
      savedRecord = updateRes.rows[0];
    } else {
      const insertRes = await query(
        `
        INSERT INTO attendance (
          staff_id, date, status,
          first_half_check_in, first_half_check_in_at, first_half_in_location,
          first_half_check_out, first_half_check_out_at, first_half_out_location,
          second_half_check_in, second_half_check_in_at, second_half_in_location,
          second_half_check_out, second_half_check_out_at, second_half_out_location,
          total_working_minutes, overtime_minutes, is_late_arrival, remarks,
          is_approved
        )
        VALUES (
          $1, $2, $3,
          $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18, $19,
          false
        )
        RETURNING *;
        `,
        [
          staffId,
          kolkataDateStr,
          timing.computedStatus,
          fIn, fInAt, fInLoc,
          fOut, fOutAt, fOutLoc,
          sIn, sInAt, sInLoc,
          sOut, sOutAt, sOutLoc,
          timing.totalWorkingMinutes,
          timing.overtimeMinutes,
          timing.isLateArrival,
          payload.remarks?.trim() || null,
        ]
      );
      savedRecord = insertRes.rows[0];
    }

    const labelMap: Record<string, string> = {
      morning_in: 'Morning Login (Punch In)',
      morning_out: 'Morning Logout (Punch Out)',
      evening_in: 'Evening Login (Punch In)',
      evening_out: 'Evening Logout (Punch Out)',
    };

    await logAuditEvent({
      actorId: session.userId,
      actorEmail: session.email,
      action: 'ATTENDANCE_PUNCH',
      entityType: 'attendance',
      entityId: savedRecord.id,
      reason: `${labelMap[punchType] || punchType} recorded at ${kolkataTimeStr} (${locationStr})`,
      afterValues: {
        punchType,
        time: kolkataTimeStr,
        timestamp: punchTimestamp,
        location: locationStr,
        date: kolkataDateStr,
      },
    });

    revalidatePath('/attendance');
    revalidatePath('/dashboard');

    return {
      success: true,
      record: savedRecord,
    };
  } catch (err: any) {
    console.error('[Punch Shift Error]:', err);
    return { success: false, error: 'Database error: ' + err.message };
  }
}

/**
 * Submit or punch attendance for a staff member
 */
export async function submitAttendanceAction(
  _prevState: AttendanceActionResponse | null,
  formData: FormData
): Promise<AttendanceActionResponse> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  // Rule: Admin can view attendance details and reports, but admin cannot record daily attendance punches
  if (session.role === 'admin') {
    return {
      success: false,
      error: 'Administrators cannot record daily attendance. Attendance punches must be submitted by staff members.',
    };
  }

  // Staff can only record attendance for their own staffId
  const targetStaffId = session.staffId;

  if (!targetStaffId) {
    return { success: false, error: 'Valid staff identity could not be verified.' };
  }

  const rawData = {
    staffId: targetStaffId,
    date: formData.get('date')?.toString().trim() || new Date().toISOString().split('T')[0],
    status: formData.get('status')?.toString() as any,
    firstHalfCheckIn: formData.get('firstHalfCheckIn')?.toString().trim() || null,
    firstHalfCheckOut: formData.get('firstHalfCheckOut')?.toString().trim() || null,
    secondHalfCheckIn: formData.get('secondHalfCheckIn')?.toString().trim() || null,
    secondHalfCheckOut: formData.get('secondHalfCheckOut')?.toString().trim() || null,
    remarks: formData.get('remarks')?.toString().trim() || null,
  };

  const validation = attendanceSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please correct the invalid attendance inputs.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Retrieve studio settings for timing thresholds
  let graceMinutes = 15;
  let fullDayMinutes = 480;
  let overtimeMinutes = 510;
  try {
    const settingsRes = await query('SELECT * FROM studio_settings WHERE id = $1;', ['default']);
    if (settingsRes.rows.length > 0) {
      const s = settingsRes.rows[0];
      graceMinutes = s.late_grace_period_minutes;
      fullDayMinutes = s.full_day_minimum_minutes;
      overtimeMinutes = s.overtime_threshold_minutes;
    }
  } catch (e) {
    // default fallbacks
  }

  // Calculate timing & durations
  const timing = calculateAttendanceTiming({
    status: data.status,
    firstHalfIn: data.firstHalfCheckIn,
    firstHalfOut: data.firstHalfCheckOut,
    secondHalfIn: data.secondHalfCheckIn,
    secondHalfOut: data.secondHalfCheckOut,
    gracePeriodMinutes: graceMinutes,
    fullDayThresholdMinutes: fullDayMinutes,
    overtimeThresholdMinutes: overtimeMinutes,
  });

  try {
    // Check if record already exists for this staff member and date
    const existing = await query(
      'SELECT id, status, total_working_minutes FROM attendance WHERE staff_id = $1 AND date = $2;',
      [data.staffId, data.date]
    );

    if (existing.rows.length > 0) {
      // Do not silently overwrite per specification
      return {
        success: false,
        error: `An attendance entry already exists for ${data.date}. Please submit an Attendance Correction Request instead of overwriting.`,
      };
    }

    // Insert new attendance record
    const insertRes = await query(
      `
      INSERT INTO attendance (
        staff_id, date, status, first_half_check_in, first_half_check_out,
        second_half_check_in, second_half_check_out, total_working_minutes,
        overtime_minutes, is_late_arrival, remarks, is_approved, approved_by, approved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, null, null)
      RETURNING id;
      `,
      [
        data.staffId,
        data.date,
        timing.computedStatus,
        data.firstHalfCheckIn || null,
        data.firstHalfCheckOut || null,
        data.secondHalfCheckIn || null,
        data.secondHalfCheckOut || null,
        timing.totalWorkingMinutes,
        timing.overtimeMinutes,
        timing.isLateArrival,
        data.remarks || null,
      ]
    );

    revalidatePath('/attendance');
    return { success: true };
  } catch (err: any) {
    console.error('[Submit Attendance Error]:', err);
    return { success: false, error: 'Database error: ' + err.message };
  }
}

/**
 * Request correction on an existing attendance record
 */
export async function requestAttendanceCorrectionAction(
  _prevState: AttendanceActionResponse | null,
  formData: FormData
): Promise<AttendanceActionResponse> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: 'Unauthorized.' };
  }

  const rawData = {
    attendanceId: formData.get('attendanceId')?.toString() || '',
    reason: formData.get('reason')?.toString().trim() || '',
    proposedStatus: formData.get('proposedStatus')?.toString() as any,
    proposedFirstHalfIn: formData.get('proposedFirstHalfIn')?.toString().trim() || null,
    proposedFirstHalfOut: formData.get('proposedFirstHalfOut')?.toString().trim() || null,
    proposedSecondHalfIn: formData.get('proposedSecondHalfIn')?.toString().trim() || null,
    proposedSecondHalfOut: formData.get('proposedSecondHalfOut')?.toString().trim() || null,
  };

  const validation = attendanceCorrectionSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please provide all required fields including a clear reason.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    // Verify attendance record ownership
    const attRes = await query('SELECT staff_id, date FROM attendance WHERE id = $1;', [data.attendanceId]);
    if (attRes.rows.length === 0) {
      return { success: false, error: 'Attendance record not found.' };
    }

    if (session.role !== 'admin' && attRes.rows[0].staff_id !== session.staffId) {
      return { success: false, error: 'You are only authorized to request corrections for your own attendance.' };
    }

    await query(
      `
      INSERT INTO attendance_corrections (
        attendance_id, requested_by, reason, proposed_status,
        proposed_first_half_in, proposed_first_half_out,
        proposed_second_half_in, proposed_second_half_out, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending');
      `,
      [
        data.attendanceId,
        session.userId,
        data.reason,
        data.proposedStatus || null,
        data.proposedFirstHalfIn || null,
        data.proposedFirstHalfOut || null,
        data.proposedSecondHalfIn || null,
        data.proposedSecondHalfOut || null,
      ]
    );

    // Notify admins
    await notifyAdmins(
      'Attendance Correction Requested',
      `${session.fullName || session.email} requested an attendance correction for ${attRes.rows[0].date}.`,
      'SYSTEM',
      '/attendance'
    );

    revalidatePath('/attendance');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin review: approve or reject an attendance correction request
 */
export async function reviewAttendanceCorrectionAction(
  correctionId: string,
  decision: 'Approved' | 'Rejected',
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin access required.' };
  }

  try {
    const corrRes = await query(
      `
      SELECT c.*, a.staff_id, a.date, a.total_working_minutes, s.full_name, s.user_id as staff_user_id
      FROM attendance_corrections c
      JOIN attendance a ON a.id = c.attendance_id
      JOIN staff s ON s.id = a.staff_id
      WHERE c.id = $1;
      `,
      [correctionId]
    );

    if (corrRes.rows.length === 0) {
      return { success: false, error: 'Correction request not found.' };
    }

    const corr = corrRes.rows[0];

    await withTransaction(async (client) => {
      if (decision === 'Approved') {
        const timing = calculateAttendanceTiming({
          status: corr.proposed_status || 'Present',
          firstHalfIn: corr.proposed_first_half_in,
          firstHalfOut: corr.proposed_first_half_out,
          secondHalfIn: corr.proposed_second_half_in,
          secondHalfOut: corr.proposed_second_half_out,
        });

        await client.query(
          `
          UPDATE attendance
          SET 
            status = $1,
            first_half_check_in = $2,
            first_half_check_out = $3,
            second_half_check_in = $4,
            second_half_check_out = $5,
            total_working_minutes = $6,
            overtime_minutes = $7,
            is_late_arrival = $8,
            is_approved = true,
            approved_by = $9,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $10;
          `,
          [
            timing.computedStatus,
            corr.proposed_first_half_in,
            corr.proposed_first_half_out,
            corr.proposed_second_half_in,
            corr.proposed_second_half_out,
            timing.totalWorkingMinutes,
            timing.overtimeMinutes,
            timing.isLateArrival,
            session.userId,
            corr.attendance_id,
          ]
        );
      }

      await client.query(
        `
        UPDATE attendance_corrections
        SET 
          status = $1,
          admin_notes = $2,
          reviewed_by = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4;
        `,
        [decision, adminNotes || null, session.userId, correctionId]
      );

      await logAuditEvent({
        actorId: session.userId,
        actorEmail: session.email,
        action: 'ATTENDANCE_CORRECTION',
        entityType: 'attendance_correction',
        entityId: correctionId,
        reason: `Correction ${decision.toLowerCase()} by admin. Reason/Notes: ${adminNotes || 'None'}`,
      });

      if (corr.staff_user_id) {
        await createNotification({
          userId: corr.staff_user_id,
          title: `Attendance Correction ${decision}`,
          message: `Your attendance correction request for ${corr.date} was ${decision.toLowerCase()}.`,
          type: 'SYSTEM',
          link: '/attendance',
        });
      }
    });

    revalidatePath('/attendance');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

