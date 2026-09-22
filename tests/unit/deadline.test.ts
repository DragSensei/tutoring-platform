import { describe, it, expect } from 'vitest';
import {
  computeAttendanceClosesAt,
  getAttendanceWindowState,
  getRemainingCheckInTime,
  isAttendanceWindowOpen,
  isCheckInExpired,
  CHECKIN_WINDOW_MS,
} from '@/shared/utils/deadline';

describe('Attendance timing utilities', () => {
  it('computes close as end_time plus the configured grace period', () => {
    const end = new Date('2026-10-01T12:00:00.000Z');
    const close = computeAttendanceClosesAt(end);
    expect(close.getTime() - end.getTime()).toBe(CHECKIN_WINDOW_MS);
    expect(close.toISOString()).toBe('2026-10-01T16:00:00.000Z');
  });

  it('rejects invalid end time input', () => {
    expect(() => computeAttendanceClosesAt('invalid-date-string')).toThrowError(
      'Invalid end_time provided for attendance close calculation'
    );
  });

  it('opens at start, stays open through exact close, then closes', () => {
    const start = new Date('2026-10-01T10:00:00.000Z');
    const end = new Date('2026-10-01T12:00:00.000Z');
    const close = computeAttendanceClosesAt(end);
    expect(getAttendanceWindowState(start, close, new Date('2026-10-01T09:59:59.999Z'))).toBe('BEFORE');
    expect(isAttendanceWindowOpen(start, close, start)).toBe(true);
    expect(getAttendanceWindowState(start, close, end)).toBe('OPEN');
    expect(getAttendanceWindowState(start, close, close)).toBe('OPEN');
    expect(getAttendanceWindowState(start, close, new Date(close.getTime() + 1))).toBe('CLOSED');
  });

  it('keeps legacy expiration/countdown helpers aligned to the close boundary', () => {
    const close = new Date('2026-10-01T16:00:00.000Z');
    expect(isCheckInExpired(close, close)).toBe(false);
    expect(isCheckInExpired(close, new Date(close.getTime() + 1))).toBe(true);
    const remaining = getRemainingCheckInTime(close, new Date('2026-10-01T14:29:45.000Z'));
    expect(remaining).toMatchObject({ hours: 1, minutes: 30, seconds: 15, isExpired: false });
  });
});
