import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/features/auth/server/session', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/features/wallets/server/wallet-actions', () => ({
  adminDeposit: vi.fn(),
}));

const { requireAuth } = await import('@/features/auth/server/session');
const { adminDeposit } = await import('@/features/wallets/server/wallet-actions');
const { POST } = await import('@/app/api/admin/wallets/deposit/route');

function request() {
  return new NextRequest('http://localhost/api/admin/wallets/deposit', {
    method: 'POST',
    body: JSON.stringify({ studentId: 'student-1', amount: 100 }),
    headers: { 'content-type': 'application/json' },
  });
}

describe('Admin wallet deposit authorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated and wrong-role callers before mutation', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'));
    expect((await POST(request())).status).toBe(401);

    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Forbidden: Insufficient privileges'));
    expect((await POST(request())).status).toBe(403);
    expect(adminDeposit).not.toHaveBeenCalled();
  });

  it('uses the authenticated Admin identity for provenance', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    });
    vi.mocked(adminDeposit).mockResolvedValue({
      walletId: 'wallet-1',
      newBalance: 100,
      isFlaggedOverdraft: false,
      transactionId: 'transaction-1',
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(adminDeposit).toHaveBeenCalledWith({
      studentId: 'student-1',
      amount: 100,
      adminUserId: 'admin-1',
    });
  });
});
