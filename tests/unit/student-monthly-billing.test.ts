import { describe, expect, it } from 'vitest';
import { calculateMonthlyAmount, classifyMonthlyEnrollment, formatCents, parseExplicitPeriod, resolveLinkedDiscount, toCents } from '@/features/finances/domain/student-monthly-billing';

const period = parseExplicitPeriod('2026-03-01', '2026-04-01')!;

describe('student monthly billing rules', () => {
  it('validates explicit start-inclusive, end-exclusive periods', () => {
    expect(period.start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(parseExplicitPeriod('2026-04-01', '2026-03-01')).toBeNull();
    expect(parseExplicitPeriod('2026-02-30', '2026-03-01')).toBeNull();
  });

  it('classifies only a single deterministic enrollment type', () => {
    expect(classifyMonthlyEnrollment(['GROUP', 'GROUP'], false)).toBe('GROUP');
    expect(classifyMonthlyEnrollment(['PRIVATE'], false)).toBe('PRIVATE');
    expect(classifyMonthlyEnrollment(['GROUP', 'PRIVATE'], false)).toBeNull();
    expect(classifyMonthlyEnrollment([], false)).toBeNull();
    expect(classifyMonthlyEnrollment(['GROUP'], true)).toBeNull();
  });

  it('applies a full-period linked relationship once to one Student', () => {
    const relation = { id: 'link-1', createdAt: new Date('2026-02-01T00:00:00Z'), endedAt: null, discountCents: 10_000 };
    const discount = resolveLinkedDiscount(period, [relation]);
    expect(discount).toEqual({ amountCents: 10_000, relationshipId: 'link-1', reviewRequired: false });
    const base = toCents('1500.00')!;
    expect(formatCents(calculateMonthlyAmount(base, discount.amountCents)!)).toBe('1400.00');
  });

  it('does not discount a relationship that ended before the period', () => {
    expect(resolveLinkedDiscount(period, [{ id: 'old', createdAt: new Date('2026-01-01Z'), endedAt: new Date('2026-03-01Z'), discountCents: 10_000 }])).toMatchObject({ amountCents: 0, relationshipId: null, reviewRequired: false });
    expect(resolveLinkedDiscount(period, [])).toMatchObject({ amountCents: 0, relationshipId: null, reviewRequired: false });
    expect(resolveLinkedDiscount(period, [{ id: 'next', createdAt: period.end, endedAt: null, discountCents: 10_000 }])).toMatchObject({ amountCents: 0, relationshipId: null, reviewRequired: false });
    expect(resolveLinkedDiscount(period, [{ id: 'ended-at-start', createdAt: new Date('2026-01-01Z'), endedAt: period.start, discountCents: 10_000 }])).toMatchObject({ amountCents: 0, relationshipId: null, reviewRequired: false });
  });

  it('requires review when a relationship starts or ends inside the period', () => {
    const base = { id: 'link', endedAt: null, discountCents: 10_000 };
    expect(resolveLinkedDiscount(period, [{ ...base, createdAt: new Date('2026-03-12Z') }]).reviewRequired).toBe(true);
    expect(resolveLinkedDiscount(period, [{ ...base, createdAt: new Date('2026-02-01Z'), endedAt: new Date('2026-03-20Z') }]).reviewRequired).toBe(true);
  });

  it('uses exact cents, never applies a second discount, and rejects negative dues', () => {
    expect(toCents('1234.56')).toBe(123_456);
    expect(formatCents(calculateMonthlyAmount(150_000, 10_000)!)).toBe('1400.00');
    expect(calculateMonthlyAmount(9_999, 10_000)).toBeNull();
    expect(toCents('12.345')).toBeNull();
  });
});
