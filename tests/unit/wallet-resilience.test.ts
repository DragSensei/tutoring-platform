import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStudentWallet } from '@/features/wallets/server/wallet-actions';
import { prisma } from '@/shared/lib/prisma';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Wallet Retrieval Foreign Key Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects wallet retrieval when user does not exist in the database', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    await expect(getStudentWallet('non-existent-user-id')).rejects.toThrow(
      'Cannot retrieve or create wallet: User "non-existent-user-id" not found in database.'
    );

    // Verify prisma.wallet.create is NEVER called with a non-existent foreign key
    expect(prisma.wallet.create).not.toHaveBeenCalled();
  });

  it('creates wallet safely when user exists but has no wallet record yet', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'valid-student-id',
    } as any);

    vi.mocked(prisma.wallet.findUnique).mockResolvedValueOnce(null);

    vi.mocked(prisma.wallet.create).mockResolvedValueOnce({
      id: 'w-new',
      user_id: 'valid-student-id',
      balance: 0 as any,
      is_flagged_overdraft: false,
      transactions: [],
    } as any);

    const result = await getStudentWallet('valid-student-id');

    expect(prisma.wallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: 'valid-student-id',
        }),
      })
    );
    expect(result.userId).toBe('valid-student-id');
    expect(result.balance).toBe(0);
  });
});
