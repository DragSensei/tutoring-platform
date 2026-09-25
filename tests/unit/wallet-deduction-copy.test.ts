import { describe, expect, it } from 'vitest';
import { describeWalletDeduction } from '@/features/finances/domain/wallet-deduction-copy';

describe('student wallet deduction wording', () => {
  it('does not claim finalization or a pricing snapshot when legacy data has neither', () => {
    expect(describeWalletDeduction({ finalizedAt: null, formattedPriceSnapshot: null, pricingProfileNameSnapshot: null })).toEqual({
      chargeStatus: 'Student wallet deduction recorded for session',
      pricingSnapshot: 'Pricing snapshot unavailable',
    });
  });

  it('identifies finalized charges and their recorded price snapshot', () => {
    expect(describeWalletDeduction({ finalizedAt: '2026-01-02T00:00:00Z', formattedPriceSnapshot: 'EGP 500.00', pricingProfileNameSnapshot: 'Private' })).toEqual({
      chargeStatus: 'Charged from student wallet for finalized session',
      pricingSnapshot: 'Session price snapshot EGP 500.00 (Private)',
    });
  });
});
