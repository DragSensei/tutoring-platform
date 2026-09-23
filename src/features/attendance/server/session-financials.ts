import { Prisma, type CommissionBasis, type SessionType, type TransactionType } from '@prisma/client';
import { SESSION_PRICING } from '@/shared/types';

type Tx = Prisma.TransactionClient;

const ZERO = new Prisma.Decimal(0);
const COMMISSION_DENOMINATOR = new Prisma.Decimal(10_000);

export interface SessionFinancialReconciliationInput {
  sessionId: string;
  studentId: string;
  sessionType: SessionType;
  present: boolean;
  occurredAt: Date;
}

export interface SessionFinancialReconciliationResult {
  adjustment: Prisma.Decimal;
  netSessionCharge: Prisma.Decimal;
  balance: Prisma.Decimal;
  isOverdraft: boolean;
  historicalOnly: boolean;
  commissionAccrued: boolean;
}

interface SessionForBilling {
  id: string;
  session_type: SessionType;
  historical_only: boolean;
  attendance_saved_at: Date | null;
  attendance_finalized_at: Date | null;
  pricing_profile_id: string | null;
  pricing_profile_name_snapshot: string | null;
  student_price_snapshot: Prisma.Decimal | null;
  pricing_profile: {
    name: string;
    private_session_price: Prisma.Decimal;
    group_session_price: Prisma.Decimal;
  } | null;
}

interface SessionBillingConfig {
  price: Prisma.Decimal;
  allowOverdraft: boolean;
  profileName: string | null;
  commissionEnabled: boolean;
  commissionBasis: CommissionBasis;
  commissionRateBps: number;
  commissionRuleVersion: number;
}

export async function reconcileSessionFinancialState(
  tx: Tx,
  input: SessionFinancialReconciliationInput
): Promise<SessionFinancialReconciliationResult> {
  const session = await tx.session.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      session_type: true,
      historical_only: true,
      attendance_saved_at: true,
      attendance_finalized_at: true,
      pricing_profile_id: true,
      pricing_profile_name_snapshot: true,
      student_price_snapshot: true,
      pricing_profile: {
        select: { name: true, private_session_price: true, group_session_price: true },
      },
    },
  });

  if (!session) throw new Error('Session not found for financial settlement');
  if (session.historical_only) {
    return {
      adjustment: ZERO,
      netSessionCharge: ZERO,
      balance: ZERO,
      isOverdraft: false,
      historicalOnly: true,
      commissionAccrued: false,
    };
  }
  if (!session.attendance_saved_at || !session.attendance_finalized_at) {
    throw new Error('Financial settlement requires saved and finalized Tutor attendance');
  }
  if (session.session_type !== input.sessionType) {
    throw new Error('Session type changed during financial settlement');
  }

  const participant = await tx.sessionParticipant.findUnique({
    where: { session_id_student_id: { session_id: session.id, student_id: input.studentId } },
    select: { student_id: true },
  });
  if (!participant) throw new Error('Financial settlement student is outside the Session roster');

  const [attendance, student, billing] = await Promise.all([
    tx.attendanceRecord.findUnique({
      where: { session_id_student_id: { session_id: session.id, student_id: input.studentId } },
      select: { id: true },
    }),
    tx.user.findUnique({
      where: { id: input.studentId },
      select: {
        id: true,
        role: true,
        referral_source: { select: { id: true, name: true, kind: true } },
      },
    }),
    getSessionBillingConfig(tx, session),
  ]);

  if (!student || student.role !== 'STUDENT') {
    throw new Error('Financial settlement requires an existing Student account');
  }
  if (Boolean(attendance) !== input.present) {
    throw new Error('Attendance changed during financial settlement');
  }

  let wallet = await tx.wallet.findUnique({ where: { user_id: student.id } });
  if (!wallet && !input.present) {
    return {
      adjustment: ZERO,
      netSessionCharge: ZERO,
      balance: ZERO,
      isOverdraft: false,
      historicalOnly: false,
      commissionAccrued: false,
    };
  }
  if (!wallet) {
    wallet = await tx.wallet.create({
      data: { user_id: student.id, balance: ZERO, is_flagged_overdraft: false },
    });
  }

  const walletEvents = await tx.walletTransaction.findMany({
    where: { wallet_id: wallet.id, session_id: session.id },
    select: { id: true, amount: true, transaction_type: true, created_by_user_id: true },
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
  });

  const systemEvents = walletEvents.filter((event) =>
    event.transaction_type === 'SESSION_DEDUCTION' ||
    (event.transaction_type === 'REFUND' && event.created_by_user_id === null)
  );
  const currentNet = systemEvents.reduce(
    (total, event) => total.add(new Prisma.Decimal(event.amount)),
    ZERO
  );
  const firstCharge = systemEvents.find((event) => event.transaction_type === 'SESSION_DEDUCTION');
  if (firstCharge && !new Prisma.Decimal(firstCharge.amount).isNegative()) {
    throw new Error('Session deduction provenance is invalid; settlement stopped');
  }

  const targetNet = input.present
    ? firstCharge ? new Prisma.Decimal(firstCharge.amount) : billing.price.negated()
    : ZERO;
  const adjustment = targetNet.sub(currentNet);
  let updatedWallet = wallet;
  let createdWalletEvent: { id: string; amount: Prisma.Decimal; transaction_type: TransactionType } | null = null;

  if (!adjustment.isZero()) {
    const newBalance = new Prisma.Decimal(wallet.balance).add(adjustment);
    const isOverdraft = newBalance.isNegative();
    if (adjustment.isNegative() && !billing.allowOverdraft && isOverdraft) {
      throw new OverdraftDisallowedError(
        'Insufficient balance: Platform policy prohibits negative account balance'
      );
    }

    updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance, is_flagged_overdraft: isOverdraft },
    });
    createdWalletEvent = await tx.walletTransaction.create({
      data: {
        wallet_id: updatedWallet.id,
        amount: adjustment,
        transaction_type: adjustment.isNegative() ? 'SESSION_DEDUCTION' : 'REFUND',
        session_id: session.id,
        created_by_user_id: null,
        created_at: input.occurredAt,
      },
      select: { id: true, amount: true, transaction_type: true },
    });
  }

  const finalNet = currentNet.add(adjustment);
  const allEvents = createdWalletEvent ? [...walletEvents, createdWalletEvent] : walletEvents;
  const commissionAccrued = await accrueCommissionForSettledCharge(
    tx,
    { session, student, billing, finalNet, walletEvents: allEvents, occurredAt: input.occurredAt }
  );

  return {
    adjustment,
    netSessionCharge: finalNet,
    balance: new Prisma.Decimal(updatedWallet.balance),
    isOverdraft: updatedWallet.is_flagged_overdraft,
    historicalOnly: false,
    commissionAccrued,
  };
}

async function getSessionBillingConfig(
  tx: Tx,
  session: SessionForBilling
): Promise<SessionBillingConfig> {
  const policy = await tx.platformPolicy.findUnique({
    where: { id: 'default' },
    select: {
      private_session_price: true,
      group_session_price: true,
      allow_overdraft: true,
      commission_enabled: true,
      commission_basis: true,
      commission_rate_bps: true,
      commission_rule_version: true,
    },
  });

  let price: Prisma.Decimal;
  let profileName = session.pricing_profile_name_snapshot;
  if (session.student_price_snapshot !== null) {
    price = new Prisma.Decimal(session.student_price_snapshot);
  } else if (session.pricing_profile_id) {
    if (!session.pricing_profile) {
      throw new Error('Selected Pricing Profile is unavailable; financial settlement stopped');
    }
    profileName = session.pricing_profile.name;
    price = new Prisma.Decimal(
      session.session_type === 'PRIVATE'
        ? session.pricing_profile.private_session_price
        : session.pricing_profile.group_session_price
    );
    await tx.session.update({
      where: { id: session.id },
      data: { student_price_snapshot: price, pricing_profile_name_snapshot: profileName },
    });
  } else {
    price = new Prisma.Decimal(
      policy
        ? session.session_type === 'PRIVATE' ? policy.private_session_price : policy.group_session_price
        : SESSION_PRICING[session.session_type]
    );
    if (session.student_price_snapshot === null) {
      await tx.session.update({
        where: { id: session.id },
        data: { student_price_snapshot: price, pricing_profile_name_snapshot: null },
      });
    }
  }

  return {
    price,
    allowOverdraft: policy?.allow_overdraft ?? true,
    profileName,
    commissionEnabled: policy?.commission_enabled ?? false,
    commissionBasis: policy?.commission_basis ?? 'FINALIZED_SESSION_WALLET_CHARGE',
    commissionRateBps: policy?.commission_rate_bps ?? 0,
    commissionRuleVersion: policy?.commission_rule_version ?? 1,
  };
}

async function accrueCommissionForSettledCharge(
  tx: Tx,
  input: {
    session: SessionForBilling;
    student: {
      id: string;
      referral_source: { id: string; name: string; kind: 'DIRECT' | 'REFERRAL' | 'SALES' } | null;
    };
    billing: SessionBillingConfig;
    finalNet: Prisma.Decimal;
  walletEvents: Array<{ id: string; amount: Prisma.Decimal; transaction_type: TransactionType; created_by_user_id?: string | null }>;
    occurredAt: Date;
  }
): Promise<boolean> {
  const { session, student, billing } = input;
  const source = student.referral_source;
  if (
    !billing.commissionEnabled ||
    billing.commissionRateBps <= 0 ||
    billing.commissionBasis !== 'FINALIZED_SESSION_WALLET_CHARGE' ||
    !source ||
    source.kind === 'DIRECT'
  ) return false;

  // Commission is only based on one exact system charge with no system refund
  // adjustment. Anything more complex lacks a single attributable event.
  const debits = input.walletEvents.filter((event) => event.transaction_type === 'SESSION_DEDUCTION');
  const systemRefunds = input.walletEvents.filter((event) => event.transaction_type === 'REFUND');
  const charge = debits[0];
  if (
    !charge ||
    debits.length !== 1 ||
    charge.created_by_user_id != null ||
    systemRefunds.length > 0 ||
    !new Prisma.Decimal(charge.amount).isNegative() ||
    !new Prisma.Decimal(charge.amount).equals(input.finalNet)
  ) return false;

  const amount = new Prisma.Decimal(charge.amount)
    .abs()
    .mul(billing.commissionRateBps)
    .div(COMMISSION_DENOMINATOR)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  await tx.commissionLedgerEntry.upsert({
    where: { session_id_student_id: { session_id: session.id, student_id: student.id } },
    create: {
      session_id: session.id,
      student_id: student.id,
      source_wallet_transaction_id: charge.id,
      recipient_source_id: source.id,
      recipient_source_name_snapshot: source.name,
      basis: billing.commissionBasis,
      basis_amount: new Prisma.Decimal(charge.amount).abs(),
      rate_bps: billing.commissionRateBps,
      amount,
      rule_version: billing.commissionRuleVersion,
      created_at: input.occurredAt,
    },
    update: {},
  });
  return true;
}

export interface TutorCompensationAccrual {
  sessionId: string;
  tutorId: string;
  deliveredMinutes: number;
  hourlyRate: Prisma.Decimal;
  amount: Prisma.Decimal;
  createdAt: Date;
}

export async function accrueTutorCompensation(
  tx: Tx,
  sessionId: string,
  occurredAt: Date
): Promise<TutorCompensationAccrual | null> {
  const session = await tx.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      tutor_id: true,
      start_time: true,
      end_time: true,
      status: true,
      historical_only: true,
      attendance_saved_at: true,
      attendance_finalized_at: true,
      tutor: { select: { role: true, tutor_hourly_rate_override: true } },
      tutor_compensation: true,
    },
  });

  if (!session) throw new Error('Session not found for Tutor compensation');
  if (session.historical_only) return null;
  if (session.status === 'CANCELLED' || !session.attendance_saved_at || !session.attendance_finalized_at) {
    throw new Error('Tutor compensation requires an explicitly saved and finalized delivery record');
  }
  if (session.tutor.role !== 'TUTOR') throw new Error('Session Tutor identity is invalid');
  if (session.tutor_compensation) return mapTutorCompensation(session.tutor_compensation);

  const deliveredMinutes = Math.floor((session.end_time.getTime() - session.start_time.getTime()) / 60_000);
  if (deliveredMinutes <= 0) throw new Error('Session duration does not prove delivered Tutor time');

  const policy = await tx.platformPolicy.findUnique({
    where: { id: 'default' },
    select: { default_tutor_hourly_rate: true },
  });
  const hourlyRate = new Prisma.Decimal(
    session.tutor.tutor_hourly_rate_override ?? policy?.default_tutor_hourly_rate ?? ZERO
  );
  if (hourlyRate.isNegative()) throw new Error('Tutor hourly rate cannot be negative');
  if (hourlyRate.isZero()) return null;
  const amount = hourlyRate
    .mul(deliveredMinutes)
    .div(60)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  const entry = await tx.tutorCompensationLedgerEntry.upsert({
    where: { session_id: session.id },
    create: {
      session_id: session.id,
      tutor_id: session.tutor_id,
      delivered_minutes: deliveredMinutes,
      hourly_rate: hourlyRate,
      amount,
      created_at: occurredAt,
    },
    update: {},
  });
  return mapTutorCompensation(entry);
}

function mapTutorCompensation(entry: {
  session_id: string;
  tutor_id: string;
  delivered_minutes: number;
  hourly_rate: Prisma.Decimal;
  amount: Prisma.Decimal;
  created_at: Date;
}): TutorCompensationAccrual {
  return {
    sessionId: entry.session_id,
    tutorId: entry.tutor_id,
    deliveredMinutes: entry.delivered_minutes,
    hourlyRate: new Prisma.Decimal(entry.hourly_rate),
    amount: new Prisma.Decimal(entry.amount),
    createdAt: entry.created_at,
  };
}

export class OverdraftDisallowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverdraftDisallowedError';
  }
}

export function isTableNotExistError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') return true;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code: unknown }).code === 'P2021';
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('p2021') || message.includes('table does not exist') ||
      message.includes('no such table') || (message.includes('relation') && message.includes('does not exist'));
  }
  return false;
}
