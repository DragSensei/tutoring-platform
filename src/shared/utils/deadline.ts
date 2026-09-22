/**
 * Canonical attendance timing utilities.
 * The policy value is a grace period after the concrete Session ends.
 */

export const CHECKIN_WINDOW_HOURS = 4;
export const CHECKIN_WINDOW_MS = CHECKIN_WINDOW_HOURS * 60 * 60 * 1000; // 14,400,000 ms

export function computeAttendanceClosesAt(
  endTime: Date | string | number,
  windowHours: number = CHECKIN_WINDOW_HOURS
): Date {
  const end = new Date(endTime);
  if (isNaN(end.getTime())) {
    throw new Error('Invalid end_time provided for attendance close calculation');
  }
  return new Date(end.getTime() + windowHours * 60 * 60 * 1000);
}

/**
 * `deadline` is the legacy database field name. It stores attendanceClosesAt.
 */
export function computeSessionDeadline(
  endTime: Date | string | number,
  windowHours: number = CHECKIN_WINDOW_HOURS
): Date {
  return computeAttendanceClosesAt(endTime, windowHours);
}

export function computeAttendanceOpensAt(startTime: Date | string | number): Date {
  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start_time provided for attendance open calculation');
  }
  return start;
}

export type AttendanceWindowState = 'BEFORE' | 'OPEN' | 'CLOSED';

export function getAttendanceWindowState(
  startTime: Date | string | number,
  closesAt: Date | string | number,
  currentTime: Date | string | number = new Date()
): AttendanceWindowState {
  const now = new Date(currentTime).getTime();
  const start = new Date(startTime).getTime();
  const close = new Date(closesAt).getTime();
  if (!Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(close)) {
    throw new Error('Invalid attendance timing provided');
  }
  if (now < start) return 'BEFORE';
  if (now <= close) return 'OPEN';
  return 'CLOSED';
}

export function isAttendanceWindowOpen(
  startTime: Date | string | number,
  closesAt: Date | string | number,
  currentTime: Date | string | number = new Date()
): boolean {
  return getAttendanceWindowState(startTime, closesAt, currentTime) === 'OPEN';
}

export function isCheckInExpired(
  deadline: Date | string | number,
  currentTime: Date | string | number = new Date()
): boolean {
  const dDate = new Date(deadline).getTime();
  const now = new Date(currentTime).getTime();
  return now > dDate;
}

export interface RemainingTime {
  isExpired: boolean;
  totalMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export function getRemainingCheckInTime(
  deadline: Date | string | number,
  currentTime: Date | string | number = new Date()
): RemainingTime {
  const dDate = new Date(deadline).getTime();
  const now = new Date(currentTime).getTime();
  const diffMs = dDate - now;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      totalMs: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Expired',
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const formatted = `${hours}h ${minutes}m ${seconds}s`;

  return {
    isExpired: false,
    totalMs: diffMs,
    hours,
    minutes,
    seconds,
    formatted,
  };
}
