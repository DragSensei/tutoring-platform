'use server';

import { Prisma, type SessionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/shared/lib/prisma';
import { requireAuth } from '@/shared/server/session';
import { calculateMonthlyAmount, classifyMonthlyEnrollment, formatCents, parseExplicitPeriod, resolveLinkedDiscount, toCents, type MonthlyBillingBlocker } from '../domain/student-monthly-billing';

type Db = Prisma.TransactionClient | typeof prisma;
type BillingRow = {
  studentId: string; studentName: string; enrollment: SessionType | null;
  baseAmount: string | null; discountAmount: string | null; finalAmount: string | null;
  relationshipId: string | null; pricingPolicyId: string | null; blockers: MonthlyBillingBlocker[];
};

async function calculateRows(db: Db, startText: string, endText: string) {
  const period = parseExplicitPeriod(startText, endText);
  if (!period) throw new Error('Enter a valid period with an end date after the start date. The end date is exclusive.');
  const [students, priorPolicy, policyChanges, linked, memberships, existing] = await Promise.all([
    db.user.findMany({ where: { role: 'STUDENT', account_status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
    db.studentMonthlyPricingPolicy.findFirst({ where: { effective_from: { lte: period.start } }, orderBy: { effective_from: 'desc' } }),
    db.studentMonthlyPricingPolicy.findFirst({ where: { effective_from: { gt: period.start, lt: period.end } }, orderBy: { effective_from: 'asc' }, select: { id: true } }),
    db.linkedStudentRelationship.findMany({
      where: { created_at: { lt: period.end }, OR: [{ ended_at: null }, { ended_at: { gt: period.start } }] },
      select: { id: true, student_a_id: true, student_b_id: true, created_at: true, ended_at: true, discount_amount: true },
    }),
    db.sessionSeriesParticipant.findMany({
      where: { series: { starts_on: { lt: period.end }, OR: [{ ends_on: null }, { ends_on: { gte: period.start } }] } },
      select: { student_id: true, series: { select: { session_type: true, status: true, ends_on: true } } },
    }),
    db.studentMonthlyReceivable.findMany({ where: { period_start: period.start, period_end: period.end }, select: { id: true, student_id: true, enrollment_type_snapshot: true, base_amount_snapshot: true, linked_student_discount_snapshot: true, final_amount: true, linked_relationship_id: true, pricing_policy_id: true } }),
  ]);
  const linkedByStudent = new Map<string, typeof linked>();
  for (const relationship of linked) for (const id of [relationship.student_a_id, relationship.student_b_id]) {
    linkedByStudent.set(id, [...(linkedByStudent.get(id) ?? []), relationship]);
  }
  const seriesByStudent = new Map<string, typeof memberships>();
  for (const membership of memberships) seriesByStudent.set(membership.student_id, [...(seriesByStudent.get(membership.student_id) ?? []), membership]);
  const existingByStudent = new Map(existing.map((receivable) => [receivable.student_id, receivable]));
  const rows: BillingRow[] = students.map((student) => {
    const saved = existingByStudent.get(student.id);
    if (saved) return {
      studentId: student.id, studentName: student.name ?? 'Student', enrollment: saved.enrollment_type_snapshot as SessionType,
      baseAmount: saved.base_amount_snapshot.toFixed(2), discountAmount: saved.linked_student_discount_snapshot.toFixed(2),
      finalAmount: saved.final_amount.toFixed(2), relationshipId: saved.linked_relationship_id,
      pricingPolicyId: saved.pricing_policy_id, blockers: ['DUPLICATE'],
    };
    const studentSeries = seriesByStudent.get(student.id) ?? [];
    const enrollment = classifyMonthlyEnrollment(
      studentSeries.map(({ series }) => series.session_type as SessionType),
      studentSeries.some(({ series }) => series.status === 'CANCELLED' || (series.status === 'ENDED' && !series.ends_on)),
    );
    const discount = resolveLinkedDiscount(period, (linkedByStudent.get(student.id) ?? []).map((relationship) => ({
      id: relationship.id, createdAt: relationship.created_at, endedAt: relationship.ended_at,
      discountCents: toCents(relationship.discount_amount.toFixed(2)) ?? 0,
    })));
    const blockers: MonthlyBillingBlocker[] = [];
    if (!enrollment) blockers.push('ENROLLMENT_REVIEW');
    if (discount.reviewRequired) blockers.push('LINKED_RELATIONSHIP_REVIEW');
    if (!priorPolicy || (priorPolicy.effective_from.getTime() > period.start.getTime())) blockers.push('MISSING_PRICE');
    if (policyChanges) blockers.push('PRICE_CHANGES_DURING_PERIOD');
    const baseCents = priorPolicy && enrollment
      ? toCents((enrollment === 'GROUP' ? priorPolicy.group_monthly_price : priorPolicy.private_monthly_price).toFixed(2))
      : null;
    const discountCents = discount.reviewRequired ? null : discount.amountCents;
    const finalCents = baseCents !== null && discountCents !== null ? calculateMonthlyAmount(baseCents, discountCents) : null;
    if (baseCents !== null && discountCents !== null && finalCents === null) blockers.push('DISCOUNT_EXCEEDS_BASE');
    return {
      studentId: student.id, studentName: student.name ?? 'Student', enrollment,
      baseAmount: baseCents === null ? null : formatCents(baseCents),
      discountAmount: discountCents === null ? null : formatCents(discountCents),
      finalAmount: finalCents === null ? null : formatCents(finalCents),
      relationshipId: discount.relationshipId, pricingPolicyId: priorPolicy?.id ?? null, blockers,
    };
  });
  return { period, rows };
}

export async function previewStudentMonthlyReceivables(start: string, end: string) {
  await requireAuth(['ADMIN']);
  try {
    const result = await calculateRows(prisma, start, end);
    return { success: true as const, period: { start: start.slice(0, 10), endExclusive: end.slice(0, 10) }, rows: result.rows };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Could not preview monthly receivables.' };
  }
}

export async function generateStudentMonthlyReceivables(start: string, end: string) {
  const auth = await requireAuth(['ADMIN']);
  try {
    const result = await serializableRetry(() => prisma.$transaction(async (tx) => {
      const { period, rows } = await calculateRows(tx, start, end);
      const validRows = rows.filter((row) => row.blockers.length === 0 && row.enrollment && row.baseAmount && row.discountAmount && row.finalAmount && row.pricingPolicyId);
      if (!validRows.length) return { created: 0, alreadyExists: rows.filter((row) => row.blockers.includes('DUPLICATE')).length, blocked: rows.filter((row) => row.blockers.length > 0).length };
      const inserted = await tx.studentMonthlyReceivable.createMany({
        data: validRows.map((row) => ({
          student_id: row.studentId,
          period_start: period.start,
          period_end: period.end,
          enrollment_type_snapshot: row.enrollment!,
          base_amount_snapshot: new Prisma.Decimal(row.baseAmount!),
          linked_student_discount_snapshot: new Prisma.Decimal(row.discountAmount!),
          final_amount: new Prisma.Decimal(row.finalAmount!),
          linked_relationship_id: row.relationshipId,
          pricing_policy_id: row.pricingPolicyId!,
          created_by_admin_id: auth.userId,
        })),
        skipDuplicates: true,
      });
      return { created: inserted.count, alreadyExists: validRows.length - inserted.count + rows.filter((row) => row.blockers.includes('DUPLICATE')).length, blocked: rows.filter((row) => row.blockers.length > 0 && !row.blockers.includes('DUPLICATE')).length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    revalidatePath('/admin/finances/receivables');
    revalidatePath('/admin/accounts/[id]', 'page');
    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      return { success: false as const, conflict: true, message: 'Billing state changed during generation. Preview again to see existing receivables.' };
    }
    console.error('Failed to generate Student monthly receivables:', error);
    return { success: false as const, message: 'Monthly receivable generation failed. Review the period and try again.' };
  }
}

async function serializableRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await work(); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
  throw new Error('Monthly receivables changed concurrently. Preview the period again.');
}
