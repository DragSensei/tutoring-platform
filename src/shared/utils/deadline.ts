/**
 * Deadline and timing utilities for session check-ins.
 * Invariant: Session check-in deadline is strictly start_time + 4 hours.
 */

export const CHECKIN_WINDOW_HOURS = 4;
export const CHECKIN_WINDOW_MS = CHECKIN_WINDOW_HOURS * 60 * 60 * 1000; // 14,400,000 ms

export function computeSessionDeadline(startTime: Date | string | number): Date {
  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start_time provided for deadline calculation');
  }
  return new Date(start.getTime() + CHECKIN_WINDOW_MS);
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
