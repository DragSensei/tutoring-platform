export type MonthlyEnrollment = 'GROUP' | 'PRIVATE';
export type MonthlyBillingBlocker = 'INVALID_PERIOD' | 'MISSING_PRICE' | 'PRICE_CHANGES_DURING_PERIOD' | 'ENROLLMENT_REVIEW' | 'LINKED_RELATIONSHIP_REVIEW' | 'DUPLICATE' | 'DISCOUNT_EXCEEDS_BASE';

export interface ExplicitBillingPeriod { start: Date; end: Date }
export interface RelationshipWindow { id: string; createdAt: Date; endedAt: Date | null; discountCents: number }

export function parseExplicitPeriod(start: string, end: string): ExplicitBillingPeriod | null {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
  };
  const periodStart = parse(start);
  const periodEnd = parse(end);
  return periodStart && periodEnd && periodStart < periodEnd ? { start: periodStart, end: periodEnd } : null;
}

export function classifyMonthlyEnrollment(types: MonthlyEnrollment[], hasUnclearSeries: boolean): MonthlyEnrollment | null {
  if (hasUnclearSeries || types.length === 0 || new Set(types).size !== 1) return null;
  return types[0];
}

export function resolveLinkedDiscount(period: ExplicitBillingPeriod, relationships: RelationshipWindow[]) {
  const overlapping = relationships.filter((relationship) =>
    relationship.createdAt < period.end && (!relationship.endedAt || relationship.endedAt > period.start));
  if (!overlapping.length) return { amountCents: 0, relationshipId: null, reviewRequired: false };
  const fullPeriod = overlapping.filter((relationship) =>
    relationship.createdAt <= period.start && (!relationship.endedAt || relationship.endedAt >= period.end));
  if (overlapping.length !== 1 || fullPeriod.length !== 1) {
    return { amountCents: 0, relationshipId: null, reviewRequired: true };
  }
  return { amountCents: fullPeriod[0].discountCents, relationshipId: fullPeriod[0].id, reviewRequired: false };
}

export function calculateMonthlyAmount(baseCents: number, discountCents: number) {
  if (!Number.isSafeInteger(baseCents) || !Number.isSafeInteger(discountCents) || baseCents < 0 || discountCents < 0) {
    throw new Error('Monthly amounts must be non-negative whole cents');
  }
  if (discountCents > baseCents) return null;
  return baseCents - discountCents;
}

export function toCents(money: string | number): number | null {
  const value = String(money);
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
