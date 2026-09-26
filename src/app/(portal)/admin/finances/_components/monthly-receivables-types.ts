/** Frontend display boundary; the finance API must supply all calculated values and eligibility. */
export interface MonthlyReceivablePreviewRow {
  studentId: string;
  studentName: string;
  enrollmentLabel: string | null;
  baseMonthlyPrice: number | null;
  linkedDiscountMonthly: number | null;
  expectedAmount: number | null;
  warnings: string[];
  blockReasons: string[];
  canGenerate: boolean;
}

export interface MonthlyReceivablePreview {
  periodStart: string;
  periodEnd: string;
  rows: MonthlyReceivablePreviewRow[];
  canConfirm: boolean;
  attention: MonthlyBillingAttentionItem[];
}

export interface MonthlyBillingAttentionItem {
  id: string;
  category: 'monthly_price_missing' | 'ambiguous_billing_enrollment' | 'partial_period_linked_relationship' | 'receivable_generation_failure' | 'pricing_change' | 'duplicate_receivable' | 'negative_due';
  studentName: string;
  details: string;
  href?: string;
}
