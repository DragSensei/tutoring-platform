import { describe, it, expect } from 'vitest';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';

describe('Configurable Platform Policies Logic', () => {
  it('computes attendance close as session end plus default 4h grace', () => {
    const end = new Date('2026-09-19T12:00:00Z');
    expect(computeAttendanceClosesAt(end).toISOString()).toBe('2026-09-19T16:00:00.000Z');
  });

  it('computes attendance close dynamically for custom grace hours', () => {
    const end = new Date('2026-09-19T12:00:00Z');
    expect(computeAttendanceClosesAt(end, 2).toISOString()).toBe('2026-09-19T14:00:00.000Z');
    expect(computeAttendanceClosesAt(end, 6).toISOString()).toBe('2026-09-19T18:00:00.000Z');
    expect(computeAttendanceClosesAt(end, 24).toISOString()).toBe('2026-09-20T12:00:00.000Z');
  });

  it('throws an error for an invalid end time', () => {
    expect(() => computeAttendanceClosesAt('invalid-date')).toThrow(
      'Invalid end_time provided for attendance close calculation'
    );
  });
});
