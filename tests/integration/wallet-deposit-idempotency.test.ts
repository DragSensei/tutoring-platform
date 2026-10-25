import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for database-backed integration tests');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;

vi.mock('@/features/auth/server/session', () => ({ requireAuth: vi.fn() }));

const { prisma } = await import('@/shared/lib/prisma');
const { requireAuth } = await import('@/features/auth/server/session');
const { adminDeposit } = await import('@/features/wallets/server/wallet-actions');
const { POST } = await import('@/app/api/admin/wallets/deposit/route');
const { adminDepositSchema } = await import('@/features/wallets/schemas');

const prefix = `test-wallet-deposit-${process.pid}-${randomUUID()}-`;
let adminId = '';
let studentId = '';
let tutorId = '';

beforeAll(async () => {
  const admin = await prisma.user.create({ data: { name: `${prefix}admin`, email: `${prefix}admin@example.com`, role: 'ADMIN' } });
  const student = await prisma.user.create({ data: { name: `${prefix}student`, email: `${prefix}student@example.com`, role: 'STUDENT', wallet: { create: { balance: 0 } } } });
  const tutor = await prisma.user.create({ data: { name: `${prefix}tutor`, email: `${prefix}tutor@example.com`, role: 'TUTOR' } });
  adminId = admin.id;
  studentId = student.id;
  tutorId = tutor.id;
  vi.mocked(requireAuth).mockResolvedValue({ userId: adminId, email: admin.email!, name: admin.name!, role: 'ADMIN' });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [adminId, studentId, tutorId].filter(Boolean) } } });
  await prisma.$disconnect();
});

async function ledgerTotal() {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { user_id: studentId } });
  const entries = await prisma.walletTransaction.findMany({ where: { wallet_id: wallet.id } });
  return { balance: Number(wallet.balance), ledger: Number(entries.reduce((total, row) => total.add(row.amount), new Prisma.Decimal(0))), entries };
}

describe('Admin wallet deposit idempotency and atomic ledger updates', () => {
  it('credits a simultaneous same-key retry once and rejects reuse for different details', async () => {
    const requestKey = randomUUID();
    const input = { studentId, amount: 12.34, requestKey, adminUserId: adminId };
    const [first, retry] = await Promise.all([adminDeposit(input), adminDeposit(input)]);
    expect(first.transactionId).toBe(retry.transactionId);
    expect(first.creditedAmount).toBe(retry.creditedAmount);
    expect(first.creditedAmount).toBe(12.34);
    expect(await prisma.walletTransaction.count({ where: { request_key: requestKey } })).toBe(1);
    expect(await ledgerTotal()).toMatchObject({ balance: 12.34, ledger: 12.34 });
    await expect(adminDeposit({ ...input, amount: 13 })).rejects.toThrow(/different details/);
    await expect(adminDeposit({ ...input, studentId: tutorId })).rejects.toThrow(/different details/);
    await expect(adminDeposit({ ...input, adminUserId: tutorId })).rejects.toThrow(/Admin identity/);
    expect(await prisma.walletTransaction.count({ where: { request_key: requestKey } })).toBe(1);
  });

  it('serializes distinct credits and keeps the wallet equal to ledger deltas', async () => {
    const inputs = [12.34, 7.66, 50, 0.01].map((amount) => ({ studentId, amount, requestKey: randomUUID(), adminUserId: adminId }));
    await Promise.all(inputs.map((input) => adminDeposit(input)));
    const result = await ledgerTotal();
    expect(result.balance).toBe(82.35);
    expect(result.ledger).toBe(82.35);
  });

  it('creates a missing Student wallet once for simultaneous first deposits', async () => {
    const student = await prisma.user.create({ data: { name: `${prefix}new-student`, email: `${prefix}new-student@example.com`, role: 'STUDENT' } });
    try {
      const [first, second] = await Promise.all([
        adminDeposit({ studentId: student.id, amount: 10.25, requestKey: randomUUID(), adminUserId: adminId }),
        adminDeposit({ studentId: student.id, amount: 2.75, requestKey: randomUUID(), adminUserId: adminId }),
      ]);
      expect(first.walletId).toBe(second.walletId);
      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { user_id: student.id } });
      const entries = await prisma.walletTransaction.findMany({ where: { wallet_id: wallet.id } });
      expect(Number(wallet.balance)).toBe(13);
      expect(Number(entries.reduce((sum, row) => sum.add(row.amount), new Prisma.Decimal(0)))).toBe(13);
    } finally {
      await prisma.user.delete({ where: { id: student.id } });
    }
  });

  it('rolls back a racing balance increment when its unique ledger insert loses', async () => {
    const requestKey = randomUUID();
    const input = { studentId, amount: 21.5, requestKey, adminUserId: adminId };
    const before = await ledgerTotal();
    await Promise.all([adminDeposit(input), adminDeposit(input)]);
    expect(await prisma.walletTransaction.count({ where: { request_key: requestKey } })).toBe(1);
    const result = await ledgerTotal();
    expect(result.balance).toBe(before.balance + input.amount);
    expect(result.ledger).toBe(before.ledger + input.amount);
  });

  it('rejects invalid money and non-Student accounts before mutation', async () => {
    for (const amount of [0, -1, 1.001, 1.0000000001, Infinity, 100000000]) {
      expect(adminDepositSchema.safeParse({ studentId, amount, requestKey: randomUUID() }).success).toBe(false);
      await expect(adminDeposit({ studentId, amount, requestKey: randomUUID(), adminUserId: adminId })).rejects.toThrow();
    }
    await expect(adminDeposit({ studentId: tutorId, amount: 1, requestKey: randomUUID(), adminUserId: adminId })).rejects.toThrow(/Student account/);
  });

  it('enforces the authenticated Admin boundary and ignores body-supplied actor identity', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'));
    const unauthorized = await POST(new Request('http://localhost/api/admin/wallets/deposit', { method: 'POST', body: JSON.stringify({ studentId, amount: 5, requestKey: randomUUID(), adminUserId: adminId }) }) as never);
    expect(unauthorized.status).toBe(401);
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: adminId, email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
    const requestKey = randomUUID();
    const response = await POST(new Request('http://localhost/api/admin/wallets/deposit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ studentId, amount: 2, requestKey, adminUserId: tutorId }) }) as never);
    expect(response.status).toBe(200);
    const mismatch = await POST(new Request('http://localhost/api/admin/wallets/deposit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ studentId, amount: 3, requestKey }) }) as never);
    expect(mismatch.status).toBe(409);
    expect((await prisma.walletTransaction.findUniqueOrThrow({ where: { request_key: requestKey } })).created_by_user_id).toBe(adminId);
    const result = await ledgerTotal();
    expect(result.ledger).toBe(result.balance);
  });
});
