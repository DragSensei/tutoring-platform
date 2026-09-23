import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/shared/server/session';
import { createReferralSource, updateAccountProfileTx } from '@/features/accounts/server/account-actions';

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), sourceCreate: vi.fn() }));
vi.mock('@/shared/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: { referralSource: { create: mocks.sourceCreate } } }));

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
});
