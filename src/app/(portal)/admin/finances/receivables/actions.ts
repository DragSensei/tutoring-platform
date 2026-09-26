'use server';

import { generateStudentMonthlyReceivables, previewStudentMonthlyReceivables } from '@/features/finances/server/student-monthly-receivables';
import type { MonthlyBillingAttentionItem, MonthlyReceivablePreview, MonthlyReceivablePreviewRow } from '../_components/monthly-receivables-types';

const reasons: Record<string, { category: MonthlyBillingAttentionItem['category']; message: string; href?: string }> = {
  MISSING_PRICE: { category: 'monthly_price_missing', message: 'Configure monthly prices effective for this period.', href: '/admin/policies' },
  PRICE_CHANGES_DURING_PERIOD: { category: 'pricing_change', message: 'A monthly price change falls inside this period.', href: '/admin/policies' },
  ENROLLMENT_REVIEW: { category: 'ambiguous_billing_enrollment', message: 'Student billing enrollment needs review.' },
  LINKED_RELATIONSHIP_REVIEW: { category: 'partial_period_linked_relationship', message: 'The linked relationship covers only part of this period; discount treatment needs a decision.' },
  DUPLICATE: { category: 'duplicate_receivable', message: 'A receivable already exists for this Student and period.' },
  DISCOUNT_EXCEEDS_BASE: { category: 'negative_due', message: 'The linked discount exceeds the configured base price.' },
};

type SuccessfulPreview = Extract<Awaited<ReturnType<typeof previewStudentMonthlyReceivables>>, { success: true }>;

function mapRow(row: SuccessfulPreview['rows'][number]): MonthlyReceivablePreviewRow {
  const blockers = row.blockers.map((code) => reasons[code]);
  return {
    studentId: row.studentId, studentName: row.studentName,
    enrollmentLabel: row.enrollment,
    baseMonthlyPrice: row.baseAmount === null ? null : Number(row.baseAmount),
    linkedDiscountMonthly: row.discountAmount === null ? null : Number(row.discountAmount),
    expectedAmount: row.finalAmount === null ? null : Number(row.finalAmount),
    warnings: row.discountAmount && Number(row.discountAmount) > 0 ? ['The linked discount is applied once for this monthly period.'] : [],
    blockReasons: blockers.map(({ message }) => message), canGenerate: row.blockers.length === 0,
  };
}

export async function previewMonthlyReceivables(start: string, end: string): Promise<MonthlyReceivablePreview> {
  const result = await previewStudentMonthlyReceivables(start, end);
  if (!result.success) throw new Error(result.message);
  const rows = result.rows.map(mapRow);
  const attention: MonthlyBillingAttentionItem[] = result.rows.flatMap((row) => row.blockers.map((code) => ({
    id: `${row.studentId}:${code}`, category: reasons[code].category,
    studentName: row.studentName, details: reasons[code].message, href: reasons[code].href ?? `/admin/accounts/${encodeURIComponent(row.studentId)}`,
  })));
  return { periodStart: result.period.start, periodEnd: result.period.endExclusive, rows, canConfirm: rows.some((row) => row.canGenerate), attention };
}

export async function confirmMonthlyReceivables(preview: MonthlyReceivablePreview) {
  const result = await generateStudentMonthlyReceivables(preview.periodStart, preview.periodEnd);
  if (!result.success) throw new Error(result.message);
  return { created: result.created, alreadyExists: result.alreadyExists, blocked: result.blocked };
}
