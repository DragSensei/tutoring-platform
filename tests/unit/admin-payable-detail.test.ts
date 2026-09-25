import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const { mocks } = vi.hoisted(() => ({ mocks: {
  requireAuth: vi.fn(), userFind: vi.fn(), sourceFind: vi.fn(),
  tutorFind: vi.fn(), tutorCount: vi.fn(), tutorAggregate: vi.fn(),
  commissionFind: vi.fn(), commissionCount: vi.fn(), commissionAggregate: vi.fn(),
  payoutFind: vi.fn(), payoutCount: vi.fn(),
} }));

vi.mock('@/shared/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: {
  user: { findUnique: mocks.userFind }, referralSource: { findUnique: mocks.sourceFind },
  tutorCompensationLedgerEntry: { findMany: mocks.tutorFind, count: mocks.tutorCount, aggregate: mocks.tutorAggregate },
  commissionLedgerEntry: { findMany: mocks.commissionFind, count: mocks.commissionCount, aggregate: mocks.commissionAggregate },
  payoutSettlement: { findMany: mocks.payoutFind, count: mocks.payoutCount },
} }));

import { getAdminPayableDetail } from '@/features/finances/server/finance-actions';

describe('Admin payable provenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ role: 'ADMIN', userId: 'admin-1' });
    mocks.userFind.mockResolvedValue({ id: 'tutor-1', name: 'Tutor One', role: 'TUTOR' });
    mocks.sourceFind.mockResolvedValue({ id: 'source-1', name: 'Referral One', kind: 'REFERRAL', is_active: true });
    mocks.tutorFind.mockResolvedValue([{ id: 'comp-1', session_id: 'session-1', delivered_minutes: 90, hourly_rate: new Prisma.Decimal(600), amount: new Prisma.Decimal(900), created_at: new Date('2026-01-02T00:00:00Z'), session: { title: 'Math', start_time: new Date('2026-01-01T00:00:00Z') } }]);
    mocks.tutorCount.mockResolvedValue(1);
    mocks.tutorAggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(900) } });
    mocks.commissionFind.mockResolvedValue([{ id: 'commission-1', session_id: 'session-2', student_id: 'student-1', recipient_source_name_snapshot: 'Referral One at time of charge', source_wallet_transaction_id: 'wallet-1', basis: 'FINALIZED_SESSION_WALLET_CHARGE', basis_amount: new Prisma.Decimal(400), rate_bps: 1000, amount: new Prisma.Decimal(40), rule_version: 3, created_at: new Date('2026-01-03T00:00:00Z'), student: { id: 'student-1', name: 'Student One' }, session: { title: 'Science', start_time: new Date('2026-01-02T00:00:00Z') } }]);
    mocks.commissionCount.mockResolvedValue(1);
    mocks.commissionAggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(40) } });
    mocks.payoutFind.mockResolvedValue([]);
    mocks.payoutCount.mockResolvedValue(0);
  });

  it('returns tutor session, rate snapshot, delivered time, and lifetime balance', async () => {
    const detail = await getAdminPayableDetail('tutor', 'tutor-1');
    expect(detail).toMatchObject({ type: 'tutor', earned: '900.00', paid: '0.00', outstanding: '900.00' });
    expect(detail?.earnings[0]).toMatchObject({ sessionId: 'session-1', deliveredMinutes: 90, rate: '600.00', amount: '900.00' });
  });

  it('returns source commission provenance to Student, session, and wallet event', async () => {
    const detail = await getAdminPayableDetail('source', 'source-1');
    expect(detail).toMatchObject({ type: 'source', sourceKind: 'REFERRAL', earned: '40.00', outstanding: '40.00' });
    expect(detail?.earnings[0]).toMatchObject({ studentId: 'student-1', studentName: 'Student One', sessionId: 'session-2', walletTransactionId: 'wallet-1', basisAmount: '400.00', rateBps: 1000 });
  });

  it('rejects recipient types outside the supported payees', async () => {
    await expect(getAdminPayableDetail('student', 'student-1')).rejects.toThrow('Invalid payable recipient');
  });
});
