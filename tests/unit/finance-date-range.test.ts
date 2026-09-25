import { describe, expect, it } from 'vitest';
import { formatAcademyDateInput } from '@/shared/utils/date-format';
import { normalizeFinanceDateRange } from '@/features/finances/server/finance-actions';

describe('finance date filters', () => {
  it('converts academy calendar dates to exact Africa/Cairo database boundaries', () => {
    const range = normalizeFinanceDateRange({ from: '2026-06-01', to: '2026-06-01' });

    expect(formatAcademyDateInput(range.from)).toBe('2026-06-01');
    expect(formatAcademyDateInput(new Date(range.from.getTime() - 1))).toBe('2026-05-31');
    expect(formatAcademyDateInput(range.until)).toBe('2026-06-02');
    expect(range.until.getTime()).toBeGreaterThan(range.from.getTime());
  });

  it('rejects malformed dates and ranges longer than one year', () => {
    expect(() => normalizeFinanceDateRange({ from: '2026-02-30', to: '2026-03-01' })).toThrow();
    expect(() => normalizeFinanceDateRange({ from: '2024-12-31', to: '2026-01-01' })).toThrow('up to 366 days');
  });

  it('expands the month preset to academy-local first and last days', () => {
    const range = normalizeFinanceDateRange({ month: '2026-02' });
    expect(range.fromLabel).toBe('2026-02-01');
    expect(range.toLabel).toBe('2026-02-28');
    expect(formatAcademyDateInput(range.from)).toBe('2026-02-01');
    expect(formatAcademyDateInput(range.until)).toBe('2026-03-01');
  });

  it('uses 22nd-to-22nd Cairo finance cycles with an exclusive next-cycle boundary', () => {
    const range = normalizeFinanceDateRange({ cycle: '2026-01' });
    expect(range.fromLabel).toBe('2026-01-22');
    expect(range.toLabel).toBe('2026-02-21');
    expect(formatAcademyDateInput(range.from)).toBe('2026-01-22');
    expect(formatAcademyDateInput(range.until)).toBe('2026-02-22');
    expect(range.cycleUntilLabel).toBe('2026-02-22');
  });

  it('defaults to the active Cairo cycle and includes the 22nd in the new cycle', () => {
    const beforeBoundary = normalizeFinanceDateRange({}, new Date('2026-06-21T20:59:59.000Z'));
    const atBoundary = normalizeFinanceDateRange({}, new Date('2026-06-21T21:00:00.000Z'));
    expect(beforeBoundary.fromLabel).toBe('2026-05-22');
    expect(beforeBoundary.toLabel).toBe('2026-06-21');
    expect(beforeBoundary.cycleMonth).toBe('2026-05');
    expect(atBoundary.fromLabel).toBe('2026-06-22');
    expect(atBoundary.toLabel).toBe('2026-07-21');
    expect(formatAcademyDateInput(atBoundary.until)).toBe('2026-07-22');
    expect(atBoundary.cycleMonth).toBe('2026-06');
  });

  it('keeps the 22 December to 22 January cycle boundary across a year rollover', () => {
    const range = normalizeFinanceDateRange({ cycle: '2026-12' });
    expect(range.fromLabel).toBe('2026-12-22');
    expect(range.toLabel).toBe('2027-01-21');
    expect(range.cycleUntilLabel).toBe('2027-01-22');
    expect(formatAcademyDateInput(range.until)).toBe('2027-01-22');
  });
});
