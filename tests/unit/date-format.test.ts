import { describe, it, expect } from 'vitest';
import { formatDateTime, formatSessionSchedule } from '@/shared/utils/date-format';

describe('Deterministic Date Formatting Utilities (Hydration Safety)', () => {
  it('formats dates identically regardless of client environment locale', () => {
    // Fixed timestamp: 2026-09-16T00:03:00.000Z (which is 03:03 Cairo UTC+3)
    const testDate = new Date('2026-09-16T00:03:00.000Z');
    
    const formatted = formatDateTime(testDate);
    // In en-GB with Africa/Cairo (UTC+3), 00:03 UTC -> 03:03 Cairo
    expect(formatted).toBe('16 Sept, 03:03');
  });

  it('formats dates with year when requested', () => {
    const testDate = new Date('2026-09-16T00:03:00.000Z');
    const formatted = formatDateTime(testDate, { includeYear: true });
    expect(formatted).toBe('16 Sept 2026, 03:03');
  });

  it('handles invalid date inputs gracefully without crashing', () => {
    expect(formatDateTime('invalid-date')).toBe('Invalid Date');
    expect(formatSessionSchedule('invalid-date')).toBe('Time unconfirmed');
  });

  it('formats full dual-timezone session schedule deterministically', () => {
    const testDate = new Date('2026-09-16T00:03:00.000Z');
    const formatted = formatSessionSchedule(testDate);
    expect(formatted).toContain('Cairo');
    expect(formatted).toContain('(00:03 UTC)');
  });
});
