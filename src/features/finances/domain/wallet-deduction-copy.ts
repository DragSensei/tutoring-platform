export function describeWalletDeduction(input: { finalizedAt: string | null; formattedPriceSnapshot: string | null; pricingProfileNameSnapshot: string | null }) {
  return {
    chargeStatus: input.finalizedAt
      ? 'Charged from student wallet for finalized session'
      : 'Student wallet deduction recorded for session',
    pricingSnapshot: input.formattedPriceSnapshot
      ? `Session price snapshot ${input.formattedPriceSnapshot}${input.pricingProfileNameSnapshot ? ` (${input.pricingProfileNameSnapshot})` : ''}`
      : 'Pricing snapshot unavailable',
  };
}
