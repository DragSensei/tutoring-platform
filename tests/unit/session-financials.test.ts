import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accrueTutorCompensation,
  OverdraftDisallowedError,
  reconcileSessionFinancialState,
} from '@/features/attendance/server/session-financials';

const session = {
  id: 'session-1',
  session_type: 'GROUP' as const,
  historical_only: false,
  attendance_saved_at: new Date('2026-09-01T10:00:00Z'),
  attendance_finalized_at: new Date('2026-09-01T14:00:00Z'),
  pricing_profile_id: 'profile-1',
  pricing_profile_name_snapshot: null,
  student_price_snapshot: null,
  pricing_profile: {
    name: 'Robotics cohort',
    private_session_price: new Prisma.Decimal('500.00'),
    group_session_price: new Prisma.Decimal('250.00'),
  },
};

function createTx(overrides: Record<string, unknown> = {}) {
  const calls = {
    sessionFind: vi.fn().mockResolvedValue(session),
    sessionUpdate: vi.fn().mockResolvedValue({}),
    participantFind: vi.fn().mockResolvedValue({ student_id: 'student-1' }),
    attendanceFind: vi.fn().mockResolvedValue({ id: 'attendance-1' }),
    userFind: vi.fn().mockResolvedValue({
      id: 'student-1',
      role: 'STUDENT',
      referral_source: { id: 'source-1', name: 'Parent referral', kind: 'REFERRAL' },
    }),
    policyFind: vi.fn().mockResolvedValue({
      private_session_price: new Prisma.Decimal('500.00'),
      group_session_price: new Prisma.Decimal('250.00'),
      allow_overdraft: true,
      commission_enabled: true,
      commission_basis: 'FINALIZED_SESSION_WALLET_CHARGE',
      commission_rate_bps: 1000,
      commission_rule_version: 2,
      default_tutor_hourly_rate: new Prisma.Decimal('600.00'),
    }),
    walletFind: vi.fn().mockResolvedValue(null),
    walletCreate: vi.fn().mockResolvedValue({
      id: 'wallet-1', balance: new Prisma.Decimal('0.00'), is_flagged_overdraft: false,
    }),
    walletUpdate: vi.fn().mockImplementation(({ data }) => ({
      id: 'wallet-1', balance: data.balance, is_flagged_overdraft: data.is_flagged_overdraft,
    })),
    walletEventsFind: vi.fn().mockResolvedValue([]),
    walletEventCreate: vi.fn().mockResolvedValue({
      id: 'wallet-event-1', amount: new Prisma.Decimal('-250.00'), transaction_type: 'SESSION_DEDUCTION',
    }),
    commissionUpsert: vi.fn().mockResolvedValue({}),
    tutorPayUpsert: vi.fn().mockImplementation(({ create }) => ({
      session_id: create.session_id,
      tutor_id: create.tutor_id,
      delivered_minutes: create.delivered_minutes,
      hourly_rate: create.hourly_rate,
      amount: create.amount,
      created_at: create.created_at,
    })),
    ...overrides,
  };

  const tx = {
    session: { findUnique: calls.sessionFind, update: calls.sessionUpdate },
    sessionParticipant: { findUnique: calls.participantFind },
    attendanceRecord: { findUnique: calls.attendanceFind },
    user: { findUnique: calls.userFind },
    platformPolicy: { findUnique: calls.policyFind },
    wallet: { findUnique: calls.walletFind, create: calls.walletCreate, update: calls.walletUpdate },
    walletTransaction: { findMany: calls.walletEventsFind, create: calls.walletEventCreate },
    commissionLedgerEntry: { upsert: calls.commissionUpsert },
    tutorCompensationLedgerEntry: { upsert: calls.tutorPayUpsert },
  } as unknown as Prisma.TransactionClient;

  return { tx, calls };
}

describe('session finance settlement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not create any finance side effect for historical-only Sessions', async () => {
    const { tx, calls } = createTx({
      sessionFind: vi.fn().mockResolvedValue({ ...session, historical_only: true }),
    });

    const result = await reconcileSessionFinancialState(tx, {
      sessionId: 'session-1', studentId: 'student-1', sessionType: 'GROUP', present: true,
      occurredAt: new Date('2026-09-01T14:00:00Z'),
    });

    expect(result.historicalOnly).toBe(true);
    expect(result.netSessionCharge.toString()).toBe('0');
    expect(calls.walletCreate).not.toHaveBeenCalled();
    expect(calls.walletEventCreate).not.toHaveBeenCalled();
    expect(calls.commissionUpsert).not.toHaveBeenCalled();
  });

  it('snapshots the selected price at settlement and accrues commission only from its exact wallet charge', async () => {
    const { tx, calls } = createTx();

    const result = await reconcileSessionFinancialState(tx, {
      sessionId: 'session-1', studentId: 'student-1', sessionType: 'GROUP', present: true,
      occurredAt: new Date('2026-09-01T14:00:00Z'),
    });

    expect(calls.sessionUpdate).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { student_price_snapshot: new Prisma.Decimal('250.00'), pricing_profile_name_snapshot: 'Robotics cohort' },
    });
    expect(result.netSessionCharge.toString()).toBe('-250');
    expect(result.commissionAccrued).toBe(true);
    const commission = calls.commissionUpsert.mock.calls[0][0];
    expect(commission.where.session_id_student_id).toEqual({ session_id: 'session-1', student_id: 'student-1' });
    expect(commission.create).toMatchObject({
      source_wallet_transaction_id: 'wallet-event-1',
      recipient_source_id: 'source-1',
      recipient_source_name_snapshot: 'Parent referral',
      rate_bps: 1000,
      rule_version: 2,
    });
    expect(new Prisma.Decimal(commission.create.amount).toString()).toBe('25');
  });

  it('does not pay commission to None or Direct sources', async () => {
    const { tx, calls } = createTx({
      userFind: vi.fn().mockResolvedValue({
        id: 'student-1', role: 'STUDENT',
        referral_source: { id: 'direct', name: 'Direct', kind: 'DIRECT' },
      }),
    });

    const result = await reconcileSessionFinancialState(tx, {
      sessionId: 'session-1', studentId: 'student-1', sessionType: 'GROUP', present: true,
      occurredAt: new Date('2026-09-01T14:00:00Z'),
    });

    expect(result.commissionAccrued).toBe(false);
    expect(calls.commissionUpsert).not.toHaveBeenCalled();
  });

  it('fails closed on commission when an Admin refund obscures the settled charge', async () => {
    const { tx, calls } = createTx({
      walletEventsFind: vi.fn().mockResolvedValue([
        { id: 'charge-1', amount: new Prisma.Decimal('-250'), transaction_type: 'SESSION_DEDUCTION', created_by_user_id: null },
        { id: 'admin-refund-1', amount: new Prisma.Decimal('50'), transaction_type: 'REFUND', created_by_user_id: 'admin-1' },
      ]),
    });

    const result = await reconcileSessionFinancialState(tx, {
      sessionId: 'session-1', studentId: 'student-1', sessionType: 'GROUP', present: true,
      occurredAt: new Date('2026-09-01T14:00:00Z'),
    });

    expect(result.commissionAccrued).toBe(false);
    expect(calls.commissionUpsert).not.toHaveBeenCalled();
  });

  it('fails closed when a charge would violate the overdraft policy', async () => {
    const { tx, calls } = createTx({
      policyFind: vi.fn().mockResolvedValue({
        private_session_price: new Prisma.Decimal('500.00'),
        group_session_price: new Prisma.Decimal('250.00'),
        allow_overdraft: false,
        commission_enabled: false,
        commission_basis: 'FINALIZED_SESSION_WALLET_CHARGE',
        commission_rate_bps: 0,
        commission_rule_version: 1,
      }),
    });

    await expect(reconcileSessionFinancialState(tx, {
      sessionId: 'session-1', studentId: 'student-1', sessionType: 'GROUP', present: true,
      occurredAt: new Date('2026-09-01T14:00:00Z'),
    })).rejects.toBeInstanceOf(OverdraftDisallowedError);
    expect(calls.walletUpdate).not.toHaveBeenCalled();
    expect(calls.walletEventCreate).not.toHaveBeenCalled();
  });
});

describe('Tutor compensation accrual', () => {
  it('leaves delivered hours unaccrued when the effective hourly rate is unset', async () => {
    const finalizedSession = {
      id: 'session-1', tutor_id: 'tutor-1',
      start_time: new Date('2026-09-01T10:00:00Z'), end_time: new Date('2026-09-01T11:30:00Z'),
      status: 'SCHEDULED', historical_only: false,
      attendance_saved_at: new Date('2026-09-01T10:00:00Z'),
      attendance_finalized_at: new Date('2026-09-01T14:00:00Z'),
      tutor: { role: 'TUTOR', tutor_hourly_rate_override: null },
      tutor_compensation: null,
    };
    const { tx, calls } = createTx({
      sessionFind: vi.fn().mockResolvedValue(finalizedSession),
      policyFind: vi.fn().mockResolvedValue({ default_tutor_hourly_rate: new Prisma.Decimal('0.00') }),
    });

    await expect(accrueTutorCompensation(tx, 'session-1', new Date('2026-09-01T14:00:00Z'))).resolves.toBeNull();
    expect(calls.tutorPayUpsert).not.toHaveBeenCalled();
  });

  it('snapshots delivered minutes, the effective rate, and the Decimal amount once', async () => {
    const finalizedSession = {
      id: 'session-1', tutor_id: 'tutor-1',
      start_time: new Date('2026-09-01T10:00:00Z'), end_time: new Date('2026-09-01T11:30:00Z'),
      status: 'SCHEDULED', historical_only: false,
      attendance_saved_at: new Date('2026-09-01T10:00:00Z'),
      attendance_finalized_at: new Date('2026-09-01T14:00:00Z'),
      tutor: { role: 'TUTOR', tutor_hourly_rate_override: new Prisma.Decimal('800.00') },
      tutor_compensation: null,
    };
    const { tx, calls } = createTx({ sessionFind: vi.fn().mockResolvedValue(finalizedSession) });

    const result = await accrueTutorCompensation(tx, 'session-1', new Date('2026-09-01T14:00:00Z'));

    expect(result?.deliveredMinutes).toBe(90);
    expect(result?.hourlyRate.toString()).toBe('800');
    expect(result?.amount.toString()).toBe('1200');
    expect(calls.tutorPayUpsert.mock.calls[0][0].create).toMatchObject({
      session_id: 'session-1', tutor_id: 'tutor-1', delivered_minutes: 90,
      hourly_rate: new Prisma.Decimal('800'), amount: new Prisma.Decimal('1200'),
    });
  });
});
