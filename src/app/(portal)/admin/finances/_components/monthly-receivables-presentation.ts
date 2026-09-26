import { formatEGP } from '@/shared/utils/currency';
import type { MonthlyReceivablePreviewRow } from './monthly-receivables-types';

export function presentMonthlyReceivableRow(row: MonthlyReceivablePreviewRow) {
  return {
    basePrice: row.baseMonthlyPrice === null ? 'Missing' : formatEGP(row.baseMonthlyPrice),
    discount: row.linkedDiscountMonthly === null ? 'Review required' : row.linkedDiscountMonthly === 0 ? 'No linked discount' : `−${formatEGP(row.linkedDiscountMonthly)}`,
    expectedAmount: row.expectedAmount === null ? 'Unavailable' : formatEGP(row.expectedAmount),
    enrollment: row.enrollmentLabel ?? 'Enrollment unavailable',
    state: row.canGenerate ? 'ready' as const : 'blocked' as const,
    reasons: row.blockReasons,
    warnings: row.warnings,
  };
}
