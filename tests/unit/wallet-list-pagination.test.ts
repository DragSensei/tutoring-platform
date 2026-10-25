import { describe, expect, it, vi } from 'vitest';
import { getAllWalletsWithUsers } from '@/features/wallets/server/wallet-actions';
import { prisma } from '@/shared/lib/prisma';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: { wallet: { findMany: vi.fn() } },
}));

function wallet(id: string) {
  return {
    id,
    user_id: id,
    balance: 0,
    is_flagged_overdraft: false,
    updated_at: new Date('2026-10-13T00:00:00.000Z'),
    user: { id, name: id, email: null, phone: null, role: 'STUDENT' },
    _count: { transactions: 0 },
  };
}

describe('admin wallet list pagination', () => {
  it('fetches stable cursor pages of at most 50 and returns every wallet', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => wallet(`wallet-${index}`));
    vi.mocked(prisma.wallet.findMany)
      .mockResolvedValueOnce(firstPage as never)
      .mockResolvedValueOnce([wallet('wallet-50')] as never);

    const result = await getAllWalletsWithUsers();

    expect(result).toHaveLength(51);
    expect(prisma.wallet.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.wallet.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      take: 50,
      orderBy: [{ balance: 'asc' }, { id: 'asc' }],
      cursor: undefined,
      skip: 0,
    }));
    expect(prisma.wallet.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      take: 50,
      cursor: { id: 'wallet-49' },
      skip: 1,
    }));
  });
});
