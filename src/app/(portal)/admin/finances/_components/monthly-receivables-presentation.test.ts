import { describe, expect, it } from 'vitest';
import { presentMonthlyReceivableRow } from './monthly-receivables-presentation';
import type { MonthlyReceivablePreviewRow } from './monthly-receivables-types';

const row: MonthlyReceivablePreviewRow = {
  studentId: 'student-1', studentName: 'Mona Hassan', enrollmentLabel: 'Mathematics · Grade 8',
  baseMonthlyPrice: 500, linkedDiscountMonthly: 100, expectedAmount: 400, warnings: [], blockReasons: [], canGenerate: true,
};

describe('monthly receivable presentation', () => {
  it('keeps price, discount, and expected amount distinct', () => {
    expect(presentMonthlyReceivableRow(row)).toMatchObject({ basePrice: '500.00 EGP', discount: '−100.00 EGP', expectedAmount: '400.00 EGP' });
  });

  it('does not display a negative discount when none applies', () => {
    expect(presentMonthlyReceivableRow({ ...row, linkedDiscountMonthly: 0 }).discount).toBe('No linked discount');
  });

  it('keeps blocked rows blocked and exposes their reasons', () => {
    expect(presentMonthlyReceivableRow({ ...row, canGenerate: false, blockReasons: ['Ambiguous billing enrollment'] })).toMatchObject({
      state: 'blocked', reasons: ['Ambiguous billing enrollment'],
    });
  });

});
