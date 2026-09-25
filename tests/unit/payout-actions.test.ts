import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    requireAuth: vi.fn(),
    revalidatePath: vi.fn(),
    userFind: vi.fn(),
    sourceFind: vi.fn(),
    settlementFind: vi.fn(),
    tutorEarned: vi.fn(),
    salesEarned: vi.fn(),
    settlementCreate: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@/shared/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction } }));

import { recordPayout } from '@/features/finances/server/payout-actions';
import { Prisma } from '@prisma/client';

function form(recipientChoice = 'tutor:tutor-1', amount = '25.00') {
  const data = new FormData();
  data.set('recipientChoice', recipientChoice);
  data.set('amount', amount);
  data.set('idempotencyKey', '123e4567-e89b-12d3-a456-426614174000');
  return data;
}
const initialState = { message: null, key: '123e4567-e89b-12d3-a456-426614174000' };

describe('record payout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.userFind.mockResolvedValue({ role: 'TUTOR' });
    mocks.sourceFind.mockResolvedValue({ id: 'source-1' });
    mocks.settlementFind.mockResolvedValue(null);
    mocks.tutorEarned.mockResolvedValue({ _sum: { amount: '100.00' } });
    mocks.salesEarned.mockResolvedValue({ _sum: { amount: '100.00' } });
    mocks.settlementCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: mocks.userFind },
      referralSource: { findUnique: mocks.sourceFind },
      payoutSettlement: { findUnique: mocks.settlementFind, findMany: vi.fn().mockResolvedValue([]), create: mocks.settlementCreate },
      tutorCompensationLedgerEntry: { aggregate: mocks.tutorEarned },
      commissionLedgerEntry: { aggregate: mocks.salesEarned },
    }));
  });

  it('records a positive payout with actor and idempotency in a serializable transaction', async () => {
    await recordPayout(initialState, form());
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(mocks.settlementCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ tutor_id: 'tutor-1', source_id: null, created_by_user_id: 'admin-1', idempotency_key: '123e4567-e89b-12d3-a456-426614174000' }) });
    expect(mocks.settlementCreate.mock.calls[0][0].data.amount.toString()).toBe('25');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/finances');
  });

  it('rejects an amount above earned less recorded settlements', async () => {
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: mocks.userFind },
      payoutSettlement: { findUnique: mocks.settlementFind, findMany: vi.fn().mockResolvedValue([{ amount: new Prisma.Decimal('90.00'), reversal_of_id: null }]), create: mocks.settlementCreate },
      tutorCompensationLedgerEntry: { aggregate: mocks.tutorEarned },
    }));
    await expect(recordPayout(initialState, form('tutor:tutor-1', '11'))).resolves.toMatchObject({ message: expect.stringContaining('exceeds') });
    expect(mocks.settlementCreate).not.toHaveBeenCalled();
  });

  it('uses the same idempotency key to avoid creating a duplicate', async () => {
    mocks.settlementFind.mockResolvedValue({ tutor_id: 'tutor-1', source_id: null, amount: new Prisma.Decimal('25'), note: null });
    await recordPayout(initialState, form());
    expect(mocks.settlementCreate).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with different payout details', async () => {
    mocks.settlementFind.mockResolvedValue({ tutor_id: 'tutor-1', source_id: null, amount: new Prisma.Decimal('24'), note: null });
    await expect(recordPayout(initialState, form())).resolves.toMatchObject({ message: expect.stringContaining('already used for different details') });
    expect(mocks.settlementCreate).not.toHaveBeenCalled();
  });

  it('nets a matching payout reversal back out of paid balance', async () => {
    const original = { amount: new Prisma.Decimal('90'), tutor_id: 'tutor-1', source_id: null, reversal_of_id: null };
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: mocks.userFind },
      payoutSettlement: { findUnique: mocks.settlementFind, findMany: vi.fn().mockResolvedValue([
        { ...original, reversal_of_id: null, reversal_of: null },
        { amount: new Prisma.Decimal('90'), tutor_id: 'tutor-1', source_id: null, reversal_of_id: 'payout-1', reversal_of: original },
      ]), create: mocks.settlementCreate },
      tutorCompensationLedgerEntry: { aggregate: mocks.tutorEarned },
    }));
    await recordPayout(initialState, form('tutor:tutor-1', '100'));
    expect(mocks.settlementCreate).toHaveBeenCalled();
  });

  it('fails closed for a reversal of a reversal or a mismatched original', async () => {
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: mocks.userFind },
      payoutSettlement: { findUnique: mocks.settlementFind, findMany: vi.fn().mockResolvedValue([
        { amount: new Prisma.Decimal('90'), tutor_id: 'tutor-1', source_id: null, reversal_of_id: 'payout-1', reversal_of: { amount: new Prisma.Decimal('90'), tutor_id: 'tutor-1', source_id: null, reversal_of_id: 'older-reversal' } },
      ]), create: mocks.settlementCreate },
      tutorCompensationLedgerEntry: { aggregate: mocks.tutorEarned },
    }));
    await expect(recordPayout(initialState, form('tutor:tutor-1', '1'))).resolves.toMatchObject({ message: expect.stringContaining('Invalid payout reversal') });
    expect(mocks.settlementCreate).not.toHaveBeenCalled();
  });

  it('rejects a reversal that points to a different recipient or amount', async () => {
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: mocks.userFind },
      payoutSettlement: { findUnique: mocks.settlementFind, findMany: vi.fn().mockResolvedValue([
        { amount: new Prisma.Decimal('90'), tutor_id: 'tutor-1', source_id: null, reversal_of_id: 'payout-1', reversal_of: { amount: new Prisma.Decimal('89'), tutor_id: 'other-tutor', source_id: null, reversal_of_id: null } },
      ]), create: mocks.settlementCreate },
      tutorCompensationLedgerEntry: { aggregate: mocks.tutorEarned },
    }));
    await expect(recordPayout(initialState, form('tutor:tutor-1', '1'))).resolves.toMatchObject({ message: expect.stringContaining('Invalid payout reversal') });
    expect(mocks.settlementCreate).not.toHaveBeenCalled();
  });

  it('retries a serializable write conflict before reporting success', async () => {
    mocks.transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('serialization conflict', { code: 'P2034', clientVersion: 'test' }));
    await recordPayout(initialState, form());
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.settlementCreate).toHaveBeenCalledTimes(1);
  });

  it('can record a sales-source payout against commission earnings', async () => {
    await recordPayout(initialState, form('source:source-1', '12.50'));
    expect(mocks.salesEarned).toHaveBeenCalled();
    expect(mocks.settlementCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ tutor_id: null, source_id: 'source-1' }) });
  });
});
