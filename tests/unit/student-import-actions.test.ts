import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/shared/server/session';
import { confirmStudentImport, previewStudentImport } from '@/features/accounts/server/student-import';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  queryRaw: vi.fn(),
  sourceFindMany: vi.fn(),
  transaction: vi.fn(),
  batchFindUnique: vi.fn(),
}));
vi.mock('@/shared/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
    referralSource: { findMany: mocks.sourceFindMany },
    studentImportBatch: { findUnique: mocks.batchFindUnique },
  },
}));

const mapping = { name: 'Full name', email: 'Email', phone: null, referralSource: 'Source' };
const csvText = 'Full name,Email,Source\nA Student,a@example.com,Direct';

function transactionFor() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    referralSource: { findMany: vi.fn().mockResolvedValue([{ id: 'direct', name: 'Direct', normalized_name: 'direct' }]) },
    studentImportBatch: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'batch-1' }),
    },
    studentImportRow: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    user: { create: vi.fn().mockResolvedValue({ id: 'student-1' }) },
  } as unknown as Prisma.TransactionClient;
  return tx;
}

describe('Admin Student CSV import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
    mocks.queryRaw.mockResolvedValue([]);
    mocks.sourceFindMany.mockResolvedValue([{ id: 'direct', name: 'Direct', normalized_name: 'direct' }]);
    mocks.batchFindUnique.mockResolvedValue(null);
  });

  it('previews a safe new Student and resolves an explicit Direct source', async () => {
    const preview = await previewStudentImport({ csvText, mapping });
    expect(preview.counts).toEqual({ ready: 1, matched: 0, conflicts: 0, errors: 0 });
    expect(preview.rows[0]).toMatchObject({ status: 'READY', referralSourceId: 'direct', referralSourceName: 'Direct' });
    expect(preview.rows[0]).not.toHaveProperty('referralSourceInput');
  });

  it('fails closed when a mapped source is unknown', async () => {
    mocks.sourceFindMany.mockResolvedValue([{ id: 'direct', name: 'Direct', normalized_name: 'direct' }]);
    const preview = await previewStudentImport({ csvText: 'Full name,Email,Source\nA Student,a@example.com,unlisted', mapping });
    expect(preview.counts.errors).toBe(1);
    expect(preview.rows[0]).toMatchObject({ status: 'INVALID', reasonCode: 'unknown_referral_source' });
  });

  it('creates only pending accounts and stores row provenance without CSV values', async () => {
    const tx = transactionFor();
    mocks.transaction.mockImplementation(async (callback: (tx: Prisma.TransactionClient) => unknown) => callback(tx));
    const preview = await previewStudentImport({ csvText, mapping });
    const result = await confirmStudentImport({
      csvText,
      mapping,
      planDigest: preview.planDigest,
      idempotencyKey: '673bfb47-74ec-48b9-a799-08313025726b',
      rowActions: [{ rowNumber: 2, action: 'CREATE' }],
    });

    expect(result).toMatchObject({ created: 1, updated: 0, matched: 0, skipped: 0, conflicts: 0, errors: 0 });
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      role: 'STUDENT', account_status: 'PENDING_CREDENTIALS', password_hash: null,
      name: 'A Student', email: 'a@example.com', phone: null, referral_source_id: 'direct',
    }), select: { id: true } });
    const createArgs = vi.mocked(tx.studentImportRow.createMany).mock.calls[0]?.[0] as { data: Array<Record<string, unknown>> } | undefined;
    expect(createArgs).toBeDefined();
    const stored = createArgs!.data;
    expect(stored).toEqual([{ batch_id: 'batch-1', row_number: 2, outcome: 'CREATED', reason_code: null, matched_user_id: 'student-1' }]);
    expect(JSON.stringify(stored)).not.toContain('a@example.com');
    expect(JSON.stringify(stored)).not.toContain('A Student');
  });

  it('retains conflicts and invalid rows as errors when Admin skips them', async () => {
    const duplicateCsv = 'Full name,Email,Source\nOne,duplicate@example.com,Direct\nTwo,duplicate@example.com,Direct';
    const preview = await previewStudentImport({ csvText: duplicateCsv, mapping });
    expect(preview.counts.conflicts).toBe(2);
    const tx = transactionFor();
    vi.mocked(tx.studentImportBatch.create).mockResolvedValue({ id: 'batch-2' } as never);
    vi.mocked(tx.studentImportRow.createMany).mockResolvedValue({ count: 2 } as never);
    mocks.transaction.mockImplementation(async (callback: (tx: Prisma.TransactionClient) => unknown) => callback(tx));
    const result = await confirmStudentImport({
      csvText: duplicateCsv,
      mapping,
      planDigest: preview.planDigest,
      idempotencyKey: '9bea2792-7f7a-4c1f-833e-e4a989bf01fb',
      rowActions: [{ rowNumber: 2, action: 'SKIP' }, { rowNumber: 3, action: 'SKIP' }],
    });

    expect(result.conflicts).toBe(2);
    const createArgs = vi.mocked(tx.studentImportRow.createMany).mock.calls[0]?.[0] as { data: Array<Record<string, unknown>> } | undefined;
    expect(createArgs).toBeDefined();
    const stored = createArgs!.data;
    expect(stored.map((row) => row.outcome)).toEqual(['CONFLICT', 'CONFLICT']);
    expect(stored.map((row) => row.reason_code)).toEqual(['duplicate_csv_identity', 'duplicate_csv_identity']);
  });
});
