import { describe, it, expect } from 'vitest';
import {
  computeSessionDeadline,
  isCheckInExpired,
  getRemainingCheckInTime,
  CHECKIN_WINDOW_MS,
} from '@/shared/utils/deadline';

describe('4-Hour Check-in Deadline Utilities', () => {
  it('strictly computes deadline as start_time + 4 hours', () => {
    const startTime = new Date('2026-10-01T10:00:00.000Z');
    const deadline = computeSessionDeadline(startTime);

    expect(deadline.getTime() - startTime.getTime()).toBe(CHECKIN_WINDOW_MS);
    expect(deadline.toISOString()).toBe('2026-10-01T14:00:00.000Z');
  });

  it('rejects invalid start time input', () => {
    expect(() => computeSessionDeadline('invalid-date-string')).toThrowError(
      'Invalid start_time provided'
    );
  });

  it('correctly evaluates check-in expiration status across boundary conditions', () => {
    const startTime = new Date('2026-10-01T10:00:00.000Z');
    const deadline = computeSessionDeadline(startTime); // 14:00:00.000Z

    // Before deadline (1 hour after start)
    const checkIn1 = new Date('2026-10-01T11:00:00.000Z');
    expect(isCheckInExpired(deadline, checkIn1)).toBe(false);

    // 1 millisecond before deadline
    const checkInBefore = new Date(deadline.getTime() - 1);
    expect(isCheckInExpired(deadline, checkInBefore)).toBe(false);

    // Exact deadline timestamp
    expect(isCheckInExpired(deadline, deadline)).toBe(false);

    // 1 millisecond after deadline (EXPIRED -> Must trigger 403)
    const checkInAfter = new Date(deadline.getTime() + 1);
    expect(isCheckInExpired(deadline, checkInAfter)).toBe(true);

    // 1 hour after deadline
    const checkInLate = new Date('2026-10-01T15:00:00.000Z');
    expect(isCheckInExpired(deadline, checkInLate)).toBe(true);
  });

  it('computes remaining time countdown breakdown accurately', () => {
    const deadline = new Date('2026-10-01T14:00:00.000Z');

    // 1 hour 30 minutes 15 seconds remaining
    const current = new Date(deadline.getTime() - (1 * 3600 + 30 * 60 + 15) * 1000);
    const res = getRemainingCheckInTime(deadline, current);

    expect(res.isExpired).toBe(false);
    expect(res.hours).toBe(1);
    expect(res.minutes).toBe(30);
    expect(res.seconds).toBe(15);
    expect(res.formatted).toBe('1h 30m 15s');

    // When time has passed
    const past = new Date(deadline.getTime() + 1000);
    const expiredRes = getRemainingCheckInTime(deadline, past);
    expect(expiredRes.isExpired).toBe(true);
    expect(expiredRes.formatted).toBe('Expired');
  });
});
