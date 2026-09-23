import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/shared/server/session';
import { updatePlatformPolicies } from '@/features/policies/server/policy-actions';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  findPolicy: vi.fn(),
  upsertPolicy: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/shared/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    platformPolicy: { findUnique: mocks.findPolicy },
    $transaction: mocks.transaction,
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const validInput = {
  checkInWindowHours: 4,
  groupSessionPrice: '375.00',
  privateSessionPrice: '500.00',
  allowOverdraft: true,
  defaultTutorHourlyRate: '600.00',
  commissionEnabled: true,
  commissionRateBps: 750,
  commissionBasis: 'FINALIZED_SESSION_WALLET_CHARGE' as const,
};

describe('Admin policy governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-1', email: 'a@example.com', name: 'Admin', role: 'ADMIN' });
    mocks.findPolicy.mockResolvedValue({ commission_enabled: false, commission_basis: 'FINALIZED_SESSION_WALLET_CHARGE', commission_rate_bps: 0, commission_rule_version: 4 });
    mocks.upsertPolicy.mockResolvedValue({});
    const tx = { platformPolicy: { findUnique: mocks.findPolicy, upsert: mocks.upsertPolicy } };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  });

  it('updates commission rule version and actor inside a serializable transaction', async () => {
    await expect(updatePlatformPolicies(validInput)).resolves.toEqual({ success: true });

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mocks.upsertPolicy).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        default_tutor_hourly_rate: new Prisma.Decimal('600.00'),
        commission_enabled: true,
        commission_rate_bps: 750,
        commission_rule_version: 5,
        commission_updated_by_user_id: 'admin-1',
        commission_updated_at: expect.any(Date),
      }),
    }));
  });

  it('rejects an enabled zero-rate rule before database mutation', async () => {
    await expect(updatePlatformPolicies({ ...validInput, commissionRateBps: 0 })).resolves.toMatchObject({
      success: false,
      message: 'Set a commission rate before enabling commission',
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.upsertPolicy).not.toHaveBeenCalled();
  });

  it('rejects unsafe decimal money strings', async () => {
    await expect(updatePlatformPolicies({ ...validInput, defaultTutorHourlyRate: '1e6' })).resolves.toMatchObject({ success: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
