/**
 * Studio GFX Attendance Timing & Duration Engine
 */

export interface TimingInput {
  status: 'Present' | 'Absent' | 'Leave' | 'Half Day' | 'Weekly Off' | 'Holiday';
  firstHalfIn?: string | null;  // HH:MM or HH:MM:SS
  firstHalfOut?: string | null;
  secondHalfIn?: string | null;
  secondHalfOut?: string | null;
  gracePeriodMinutes?: number;
  scheduledStart?: string;      // default "09:30"
  fullDayThresholdMinutes?: number; // default 480 (8 hours)
  overtimeThresholdMinutes?: number; // default 510 (8.5 hours)
}

export interface TimingResult {
  totalWorkingMinutes: number;
  overtimeMinutes: number;
  isLateArrival: boolean;
  computedStatus: 'Present' | 'Absent' | 'Leave' | 'Half Day' | 'Weekly Off' | 'Holiday';
  formattedWorkingTime: string;
}

/**
 * Convert "HH:MM" or "HH:MM:SS" into minutes from midnight
 */
export function timeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Format minutes into "Xh Ym" string
 */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0h 0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function calculateAttendanceTiming(input: TimingInput): TimingResult {
  const {
    status,
    firstHalfIn,
    firstHalfOut,
    secondHalfIn,
    secondHalfOut,
    gracePeriodMinutes = 15,
    scheduledStart = '09:30',
    fullDayThresholdMinutes = 480,
    overtimeThresholdMinutes = 510,
  } = input;

  // For non-working statuses like Absent, Leave, Holiday, Weekly Off without punches
  if (['Absent', 'Leave', 'Weekly Off', 'Holiday'].includes(status) && !firstHalfIn && !secondHalfIn) {
    return {
      totalWorkingMinutes: 0,
      overtimeMinutes: 0,
      isLateArrival: false,
      computedStatus: status,
      formattedWorkingTime: '0h 0m',
    };
  }

  let totalMinutes = 0;

  // First half duration
  const fIn = timeToMinutes(firstHalfIn);
  const fOut = timeToMinutes(firstHalfOut);
  if (fIn !== null && fOut !== null && fOut > fIn) {
    totalMinutes += (fOut - fIn);
  }

  // Second half duration
  const sIn = timeToMinutes(secondHalfIn);
  const sOut = timeToMinutes(secondHalfOut);
  if (sIn !== null && sOut !== null && sOut > sIn) {
    totalMinutes += (sOut - sIn);
  }

  // Late arrival check:
  // If firstHalfIn is more than gracePeriodMinutes past scheduledStart
  let isLate = false;
  const schedMinutes = timeToMinutes(scheduledStart) || 570; // 09:30 default
  if (fIn !== null) {
    if (fIn > schedMinutes + gracePeriodMinutes) {
      isLate = true;
    }
  }

  // Overtime calculation
  let overtime = 0;
  if (totalMinutes > overtimeThresholdMinutes) {
    overtime = totalMinutes - fullDayThresholdMinutes;
  }

  // Status computation if set to Present or Half Day
  let computedStatus = status;
  if (status === 'Present' || status === 'Half Day') {
    if (totalMinutes >= 240 && totalMinutes < fullDayThresholdMinutes) {
      computedStatus = 'Half Day';
    } else if (totalMinutes >= fullDayThresholdMinutes) {
      computedStatus = 'Present';
    }
  }

  return {
    totalWorkingMinutes: totalMinutes,
    overtimeMinutes: overtime,
    isLateArrival: isLate,
    computedStatus,
    formattedWorkingTime: formatMinutes(totalMinutes),
  };
}

