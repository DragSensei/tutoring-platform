import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/shared/server/session';
import { createReferralSource, updateAccountProfileTx, updateReferralSource } from '@/features/accounts/server/account-actions';

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), sourceCreate: vi.fn(), sourceFind: vi.fn(), sourceUpdate: vi.fn(), commissionCount: vi.fn(), transaction: vi.fn() }));
vi.mock('@/shared/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction, referralSource: { create: mocks.sourceCreate } } }));

function txFor(role: 'STUDENT' | 'TUTOR' = 'STUDENT', sourceActive = true) {
  const userUpdate = vi.fn().mockResolvedValue({
    id: 'user-1', role, name: 'Updated', email: null, phone: null,
    referral_source_id: role === 'STUDENT' ? 'source-1' : null,
    tutor_hourly_rate_override: role === 'TUTOR' ? new Prisma.Decimal('650.00') : null,
  });
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'user-1', role }),
      findFirst: vi.fn().mockResolvedValue(null),
      update: userUpdate,
    },
    referralSource: { findUnique: vi.fn().mockResolvedValue({ id: 'source-1', kind: 'REFERRAL', is_active: sourceActive }) },
  } as unknown as Prisma.TransactionClient;
  return { tx, userUpdate };
}

describe('Admin account attribution and pay mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-1', email: 'a@example.com', name: 'Admin', role: 'ADMIN' });
    mocks.transaction.mockImplementation((work: (tx: unknown) => unknown) => work({
      referralSource: { findUnique: mocks.sourceFind, update: mocks.sourceUpdate },
      user: { count: vi.fn().mockResolvedValue(0) },
      commissionLedgerEntry: { count: mocks.commissionCount },
    }));
  });

  it('validates an untrusted referral-source request before using its fields', async () => {
    await expect(createReferralSource(null)).rejects.toThrow();
    expect(mocks.sourceCreate).not.toHaveBeenCalled();
  });

  it('assigns Student source through the canonical profile update with duplicate checks', async () => {
    const { tx, userUpdate } = txFor('STUDENT');
    await updateAccountProfileTx(tx, 'user-1', {
      name: 'Updated', email: '', phone: '', referralSourceId: 'source-1',
    });

    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        name: 'Updated', email: null, phone: null,
        referral_source: { connect: { id: 'source-1' } },
      }),
    }));
    const mutation = userUpdate.mock.calls[0][0].data;
    expect(mutation).not.toHaveProperty('password_hash');
    expect(mutation).not.toHaveProperty('role');
    expect(mutation).not.toHaveProperty('account_status');
  });

  it('stores an optional Tutor override as Decimal money and rejects identity conflicts', async () => {
    const { tx, userUpdate } = txFor('TUTOR');
    await updateAccountProfileTx(tx, 'user-1', { tutorHourlyRateOverride: '650.00' });
    expect(userUpdate.mock.calls[0][0].data.tutor_hourly_rate_override).toEqual(new Prisma.Decimal('650.00'));

    const conflicting = txFor('TUTOR');
    vi.mocked(conflicting.tx.user.findFirst).mockResolvedValue({ id: 'other-user' } as never);
    await expect(updateAccountProfileTx(conflicting.tx, 'user-1', { email: 'claimed@example.com' })).rejects.toThrow('already uses');
    expect(conflicting.userUpdate).not.toHaveBeenCalled();
  });

  it('fails closed when an assigned source is inactive', async () => {
    const { tx, userUpdate } = txFor('STUDENT', false);
    await expect(updateAccountProfileTx(tx, 'user-1', { referralSourceId: 'source-1' })).rejects.toThrow('active referral source');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('allows saving other Student fields while retaining an unchanged inactive source', async () => {
    const { tx, userUpdate } = txFor('STUDENT');
    vi.mocked(tx.user.findUnique).mockResolvedValue({ id: 'user-1', role: 'STUDENT', referral_source_id: 'source-1' } as never);
    await updateAccountProfileTx(tx, 'user-1', { name: 'Updated', referralSourceId: 'source-1' });
    expect(userUpdate).toHaveBeenCalled();
    expect(tx.referralSource.findUnique).not.toHaveBeenCalled();
  });

  it('protects Direct while allowing source renames without changing source identity', async () => {
    await expect(updateReferralSource({ id: 'direct', name: 'Other' })).rejects.toThrow('protected');
    expect(mocks.sourceUpdate).not.toHaveBeenCalled();
    mocks.sourceFind.mockResolvedValue({ id: 'source-1', name: 'Old name', normalized_name: 'old name', kind: 'SALES', is_active: true });
    mocks.sourceUpdate.mockResolvedValue({ id: 'source-1', name: 'New name', kind: 'SALES', is_active: true });
    await updateReferralSource({ id: 'source-1', name: 'New name' });
    expect(mocks.sourceUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'source-1' }, data: { name: 'New name', normalized_name: 'new name' } }));
    expect(mocks.commissionCount).not.toHaveBeenCalled();
  });

  it('prevents changing a sales source type after commission provenance exists', async () => {
    mocks.sourceFind.mockResolvedValue({ id: 'source-1', name: 'Seller', normalized_name: 'seller', kind: 'SALES', is_active: true });
    mocks.commissionCount.mockResolvedValue(1);
    await expect(updateReferralSource({ id: 'source-1', kind: 'REFERRAL' })).rejects.toThrow('fixed after student attribution or commission history');
    expect(mocks.sourceUpdate).not.toHaveBeenCalled();
  });
});
