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
});
