import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/server/session', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
  },
}));
vi.mock('@/features/wallets/server/wallet-actions', () => ({
  getStudentWallet: vi.fn(),
}));

const { requireAuth } = await import('@/features/auth/server/session');
const { prisma } = await import('@/shared/lib/prisma');
const { getStudentDashboardData } = await import(
  '@/app/(portal)/student/dashboard/_components/dashboard-data'
);

describe('Student portal identity boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not select or create a demo Student for an unauthenticated request', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    await expect(getStudentDashboardData()).rejects.toThrow('Unauthorized');
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
