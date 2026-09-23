import { Prisma } from '@prisma/client';
import { requireAuth } from '@/shared/server/session';
import { prisma } from '@/shared/lib/prisma';
import { addCalendarDays, formatCalendarDate, parseCalendarDate } from '@/shared/utils/calendar-date';
import { formatAcademyDateInput } from '@/shared/utils/date-format';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const academyDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo', calendar: 'gregory', year: 'numeric', month: '2-digit', day: '2-digit',
});

export interface FinanceDateRangeInput {
  month?: string;
  from?: string;
  to?: string;
}

function parseDay(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Dates must use YYYY-MM-DD');
  if (formatCalendarDate(parseCalendarDate(value)) !== value) throw new Error('Invalid finance report date');
  return value;
}

function startOfAcademyDate(value: string): Date {
  const parsed = parseCalendarDate(value);
  const approximate = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  const localDate = (instant: Date) => {
    const parts = Object.fromEntries(academyDateFormatter.formatToParts(instant).map(({ type, value: part }) => [type, part]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  let low = approximate - 36 * 60 * 60 * 1000;
  let high = approximate + 36 * 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDate(new Date(middle)) >= value) high = middle;
    else low = middle;
  }
  const boundary = new Date(high);
  if (localDate(boundary) !== value) throw new Error('Unable to resolve academy calendar date');
  return boundary;
}

export function normalizeFinanceDateRange(input: FinanceDateRangeInput = {}, now = new Date()) {
  const today = formatAcademyDateInput(now);
  const fromFallback = formatCalendarDate(addCalendarDays(parseCalendarDate(today), -29));
  let fromLabel = parseDay(input.from, fromFallback);
  let toLabel = parseDay(input.to, today);
  if (input.month) {
    if (!/^\d{4}-\d{2}$/.test(input.month)) throw new Error('Month must use YYYY-MM');
    const monthStart = parseCalendarDate(`${input.month}-01`);
    fromLabel = formatCalendarDate(monthStart);
    let monthEnd = addCalendarDays(monthStart, 31);
    while (!formatCalendarDate(monthEnd).startsWith(`${input.month}-`)) monthEnd = addCalendarDays(monthEnd, -1);
    toLabel = formatCalendarDate(monthEnd);
  }
  const from = startOfAcademyDate(fromLabel);
  const to = startOfAcademyDate(toLabel);
  const until = startOfAcademyDate(formatCalendarDate(addCalendarDays(parseCalendarDate(toLabel), 1)));
  const days = (Date.parse(`${toLabel}T00:00:00.000Z`) - Date.parse(`${fromLabel}T00:00:00.000Z`)) / DAY_MS + 1;
  if (days <= 0 || days > MAX_RANGE_DAYS) throw new Error('Choose a date range of up to 366 days');
  return { from, to, until, fromLabel, toLabel };
}

export async function getAdminFinanceReport(input: FinanceDateRangeInput = {}) {
  await requireAuth(['ADMIN']);
  const range = normalizeFinanceDateRange(input);
  const [sessions, compensation, commissions, charges, compensationTotals, commissionTotals, chargeTotals, policy] = await Promise.all([
    prisma.session.findMany({
      where: {
        historical_only: false,
        status: 'COMPLETED',
        attendance_saved_at: { not: null },
        attendance_finalized_at: { gte: range.from, lt: range.until },
      },
      select: {
        id: true,
        title: true,
        start_time: true,
        end_time: true,
        attendance_finalized_at: true,
        tutor: { select: { id: true, name: true, tutor_hourly_rate_override: true } },
        tutor_compensation: { select: { id: true, delivered_minutes: true, hourly_rate: true, amount: true } },
      },
      orderBy: [{ attendance_finalized_at: 'desc' }, { id: 'desc' }],
    }),
    prisma.tutorCompensationLedgerEntry.findMany({
      where: { created_at: { gte: range.from, lt: range.until } },
      select: {
        id: true,
        session_id: true,
        tutor_id: true,
        delivered_minutes: true,
        hourly_rate: true,
        amount: true,
        created_at: true,
        tutor: { select: { name: true } },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 200,
    }),
    prisma.commissionLedgerEntry.findMany({
      where: { created_at: { gte: range.from, lt: range.until } },
      select: {
        id: true,
        session_id: true,
        student_id: true,
        recipient_source_id: true,
        recipient_source_name_snapshot: true,
        source_wallet_transaction_id: true,
        basis: true,
        basis_amount: true,
        rate_bps: true,
        rule_version: true,
        amount: true,
        created_at: true,
        student: { select: { name: true } },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 200,
    }),
    prisma.walletTransaction.findMany({
      where: {
        transaction_type: 'SESSION_DEDUCTION',
        created_by_user_id: null,
        created_at: { gte: range.from, lt: range.until },
        session: { is: { historical_only: false } },
      },
      select: { id: true, amount: true, session_id: true, created_at: true },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 200,
    }),
    prisma.tutorCompensationLedgerEntry.aggregate({
      where: { created_at: { gte: range.from, lt: range.until } },
      _sum: { amount: true }, _count: { _all: true },
    }),
    prisma.commissionLedgerEntry.aggregate({
      where: { created_at: { gte: range.from, lt: range.until } },
      _sum: { amount: true }, _count: { _all: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        transaction_type: 'SESSION_DEDUCTION',
        created_by_user_id: null,
        created_at: { gte: range.from, lt: range.until },
        session: { is: { historical_only: false } },
      },
      _sum: { amount: true }, _count: { _all: true },
    }),
    prisma.platformPolicy.findUnique({
      where: { id: 'default' },
      select: {
        default_tutor_hourly_rate: true,
        commission_enabled: true,
        commission_basis: true,
        commission_rate_bps: true,
        commission_rule_version: true,
        commission_updated_by_user_id: true,
        commission_updated_at: true,
        updated_at: true,
        commission_updated_by: { select: { name: true } },
      },
    }),
  ]);

  const deliveredMinutes = sessions.reduce((total, session) =>
    total + Math.max(0, Math.floor((session.end_time.getTime() - session.start_time.getTime()) / 60_000)), 0);
  const unaccruedSessions = sessions.filter((session) => !session.tutor_compensation);
  const unaccruedMinutes = unaccruedSessions.reduce((total, session) =>
    total + Math.max(0, Math.floor((session.end_time.getTime() - session.start_time.getTime()) / 60_000)), 0);
  const unaccruedRows = unaccruedSessions.map((session) => {
    const effectiveRate = session.tutor.tutor_hourly_rate_override ?? policy?.default_tutor_hourly_rate ?? new Prisma.Decimal(0);
    const deliveredMinutes = Math.max(0, Math.floor((session.end_time.getTime() - session.start_time.getTime()) / 60_000));
    return { session, effectiveRate, deliveredMinutes };
  });

  return {
    range: { from: range.fromLabel, to: range.toLabel, month: input.month ?? '' },
    summary: {
      deliveredMinutes,
      compensatedMinutes: sessions.reduce((total, session) => total + (session.tutor_compensation?.delivered_minutes ?? 0), 0),
      tutorCompensation: new Prisma.Decimal(compensationTotals._sum.amount ?? 0).toFixed(2),
      commission: new Prisma.Decimal(commissionTotals._sum.amount ?? 0).toFixed(2),
      systemTrackedCharges: new Prisma.Decimal(chargeTotals._sum.amount ?? 0).abs().toFixed(2),
      unaccruedMinutes,
      unaccruedSessionCount: unaccruedSessions.length,
      needsRateReviewMinutes: unaccruedRows.filter((row) => row.effectiveRate.isZero()).reduce((total, row) => total + row.deliveredMinutes, 0),
      needsRateReviewCount: unaccruedRows.filter((row) => row.effectiveRate.isZero()).length,
    },
    policy: {
      defaultTutorHourlyRate: policy?.default_tutor_hourly_rate.toFixed(2) ?? '0.00',
      commissionEnabled: policy?.commission_enabled ?? false,
      commissionBasis: policy?.commission_basis ?? 'FINALIZED_SESSION_WALLET_CHARGE',
      commissionRateBps: policy?.commission_rate_bps ?? 0,
      commissionRuleVersion: policy?.commission_rule_version ?? 1,
      commissionUpdatedBy: policy?.commission_updated_by?.name ?? null,
      commissionUpdatedAt: policy?.commission_updated_at?.toISOString() ?? null,
    },
    unaccrued: unaccruedRows.slice(0, 100).map(({ session, effectiveRate, deliveredMinutes }) => ({
      sessionId: session.id,
      title: session.title,
      tutorName: session.tutor.name ?? 'Unnamed tutor',
      startTime: session.start_time.toISOString(),
      finalizedAt: session.attendance_finalized_at?.toISOString() ?? null,
      deliveredMinutes,
      effectiveRate: effectiveRate.toFixed(2),
      needsRateReview: effectiveRate.isZero(),
    })),
    compensation: compensation.map((entry) => ({
      id: entry.id,
      sessionId: entry.session_id,
      tutorId: entry.tutor_id,
      tutorName: entry.tutor.name ?? 'Unnamed tutor',
      deliveredMinutes: entry.delivered_minutes,
      hourlyRate: entry.hourly_rate.toFixed(2),
      amount: entry.amount.toFixed(2),
      createdAt: entry.created_at.toISOString(),
    })),
    commissions: commissions.map((entry) => ({
      id: entry.id,
      sessionId: entry.session_id,
      studentName: entry.student.name ?? 'Unnamed student',
      studentId: entry.student_id,
      sourceId: entry.recipient_source_id,
      recipientSource: entry.recipient_source_name_snapshot,
      sourceWalletTransactionId: entry.source_wallet_transaction_id,
      basis: entry.basis,
      basisAmount: entry.basis_amount.toFixed(2),
      rateBps: entry.rate_bps,
      ruleVersion: entry.rule_version,
      amount: entry.amount.toFixed(2),
      createdAt: entry.created_at.toISOString(),
    })),
    charges: charges.map((entry) => ({
      id: entry.id,
      sessionId: entry.session_id,
      amount: new Prisma.Decimal(entry.amount).abs().toFixed(2),
      createdAt: entry.created_at.toISOString(),
    })),
    displayedRows: {
      compensation: compensationTotals._count._all,
      commissions: commissionTotals._count._all,
      charges: chargeTotals._count._all,
      limit: 200,
    },
  };
}

export async function getAdminFinanceSessionDetail(sessionId: string) {
  await requireAuth(['ADMIN']);
  if (!sessionId || sessionId.length > 128) throw new Error('Invalid Session ID');
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      status: true,
      historical_only: true,
      session_type: true,
      start_time: true,
      end_time: true,
      attendance_saved_at: true,
      attendance_finalized_at: true,
      student_price_snapshot: true,
      pricing_profile_name_snapshot: true,
      tutor: { select: { id: true, name: true } },
      participants: { select: { student: { select: { id: true, name: true } } } },
      attendances: { select: { student_id: true } },
      tutor_compensation: { select: { tutor_id: true, delivered_minutes: true, hourly_rate: true, amount: true, created_at: true } },
      transactions: {
        where: { transaction_type: 'SESSION_DEDUCTION', created_by_user_id: null },
        select: {
          id: true,
          amount: true,
          created_at: true,
          wallet: { select: { user: { select: { id: true, name: true } } } },
          commission_entry: {
            select: {
              recipient_source_id: true,
              recipient_source_name_snapshot: true,
              basis: true,
              basis_amount: true,
              rate_bps: true,
              amount: true,
              rule_version: true,
            },
          },
        },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      },
    },
  });
  if (!session) return null;
  const presentIds = new Set(session.attendances.map(({ student_id }) => student_id));
  return {
    id: session.id,
    title: session.title,
    status: session.status,
    historicalOnly: session.historical_only,
    sessionType: session.session_type,
    startTime: session.start_time.toISOString(),
    endTime: session.end_time.toISOString(),
    attendanceSavedAt: session.attendance_saved_at?.toISOString() ?? null,
    finalizedAt: session.attendance_finalized_at?.toISOString() ?? null,
    priceSnapshot: session.student_price_snapshot?.toFixed(2) ?? null,
    pricingProfileNameSnapshot: session.pricing_profile_name_snapshot,
    tutor: { id: session.tutor.id, name: session.tutor.name ?? 'Unnamed tutor' },
    students: session.participants.map(({ student }) => ({
      id: student.id,
      name: student.name ?? 'Unnamed student',
      attended: presentIds.has(student.id),
    })),
    compensation: session.tutor_compensation ? {
      tutorId: session.tutor_compensation.tutor_id,
      deliveredMinutes: session.tutor_compensation.delivered_minutes,
      hourlyRate: session.tutor_compensation.hourly_rate.toFixed(2),
      amount: session.tutor_compensation.amount.toFixed(2),
      createdAt: session.tutor_compensation.created_at.toISOString(),
    } : null,
    charges: session.transactions.map((transaction) => ({
      id: transaction.id,
      studentId: transaction.wallet.user.id,
      studentName: transaction.wallet.user.name ?? 'Unnamed student',
      amount: transaction.amount.toFixed(2),
      createdAt: transaction.created_at.toISOString(),
      commission: transaction.commission_entry ? {
        sourceId: transaction.commission_entry.recipient_source_id,
        sourceName: transaction.commission_entry.recipient_source_name_snapshot,
        basis: transaction.commission_entry.basis,
        basisAmount: transaction.commission_entry.basis_amount.toFixed(2),
        rateBps: transaction.commission_entry.rate_bps,
        amount: transaction.commission_entry.amount.toFixed(2),
        ruleVersion: transaction.commission_entry.rule_version,
      } : null,
    })),
  };
}
