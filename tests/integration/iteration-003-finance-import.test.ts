import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for database-backed integration tests');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/shared/server/session', () => ({ requireAuth: vi.fn() }));

const { prisma } = await import('@/shared/lib/prisma');
const { requireAuth } = await import('@/shared/server/session');
const { saveTutorAttendance } = await import('@/app/(portal)/tutor/attendance/actions');
const { finalizeDueAttendance } = await import('@/features/attendance/server/finalize-due-attendance');
const { accrueTutorCompensation, reconcileSessionFinancialState } = await import('@/features/attendance/server/session-financials');
const { updatePlatformPolicies } = await import('@/features/policies/server/policy-actions');
const { getAdminFinanceSessionDetail } = await import('@/features/finances/server/finance-actions');
const { confirmStudentImport, previewStudentImport } = await import('@/features/accounts/server/student-import');
const { initiateAccountSetup } = await import('@/features/accounts/server/account-actions');

const prefix = `test-003-finance-import-${process.pid}-${Date.now()}-`;
let adminId = '';
let originalPolicy: Awaited<ReturnType<typeof prisma.platformPolicy.findUnique>> = null;
const userIds = new Set<string>();
const sourceIds = new Set<string>();
const sessionIds = new Set<string>();
const batchKeys = new Set<string>();
let directSourceId = '';

async function createUser(role: 'ADMIN' | 'TUTOR' | 'STUDENT', suffix: string, extra: Partial<Prisma.UserCreateInput> = {}) {
  const user = await prisma.user.create({
    data: {
      name: `${role} ${prefix}${suffix}`,
      email: `${prefix}${suffix}@example.com`,
      phone: `+2010${process.pid}${String(userIds.size + 1).padStart(8, '0')}`,
      role,
      account_status: 'ACTIVE',
      ...extra,
    },
  });
  userIds.add(user.id);
  return user;
}

async function createSource(suffix: string, kind: 'REFERRAL' | 'SALES' | 'DIRECT' = 'REFERRAL') {
  const name = `${prefix}${suffix}`;
  const source = await prisma.referralSource.create({
    data: { name, normalized_name: name.toLocaleLowerCase('en'), kind },
  });
  sourceIds.add(source.id);
  return source;
}

async function ensureDirectSource() {
  const source = await prisma.referralSource.upsert({
    where: { id: 'direct' },
    create: { id: 'direct', name: 'Direct', normalized_name: 'direct', kind: 'DIRECT', is_active: true },
    update: { is_active: true },
  });
  if (source.name !== 'Direct' || source.normalized_name !== 'direct' || source.kind !== 'DIRECT') {
    throw new Error('Test database has an invalid canonical Direct source');
  }
  directSourceId = source.id;
}

async function createSession(input: {
  tutorId: string;
  studentId: string;
  title: string;
  start: Date;
  end: Date;
  historicalOnly?: boolean;
  savedAt?: Date;
}) {
  const session = await prisma.session.create({
    data: {
      title: `${prefix}${input.title}`,
      tutor_id: input.tutorId,
      session_type: 'GROUP',
      start_time: input.start,
      end_time: input.end,
      deadline: new Date(input.end.getTime() + 4 * 60 * 60_000),
      historical_only: input.historicalOnly ?? false,
      attendance_saved_at: input.savedAt,
      participants: { create: [{ student_id: input.studentId }] },
      ...(input.historicalOnly && input.savedAt ? { attendances: { create: [{ student_id: input.studentId, attended_at: input.savedAt }] } } : {}),
    },
  });
  sessionIds.add(session.id);
  return session;
}

async function setPolicy(input: {
  defaultRate: string;
  commissionEnabled: boolean;
  commissionRateBps: number;
  groupPrice?: string;
  ruleVersion?: number;
}) {
  const data = {
    check_in_window_hours: 4,
    group_session_price: new Prisma.Decimal(input.groupPrice ?? '375.00'),
    private_session_price: new Prisma.Decimal('500.00'),
    allow_overdraft: true,
    default_tutor_hourly_rate: new Prisma.Decimal(input.defaultRate),
    commission_enabled: input.commissionEnabled,
    commission_basis: 'FINALIZED_SESSION_WALLET_CHARGE' as const,
    commission_rate_bps: input.commissionRateBps,
    commission_rule_version: input.ruleVersion ?? 7,
    commission_updated_by_user_id: adminId,
    commission_updated_at: new Date(),
  };
  await prisma.platformPolicy.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
}

async function cleanup() {
  const ids = [...sessionIds];
  if (ids.length) {
    await prisma.commissionLedgerEntry.deleteMany({ where: { session_id: { in: ids } } });
    await prisma.tutorCompensationLedgerEntry.deleteMany({ where: { session_id: { in: ids } } });
    await prisma.walletTransaction.deleteMany({ where: { session_id: { in: ids } } });
    await prisma.attendanceRecord.deleteMany({ where: { session_id: { in: ids } } });
    await prisma.sessionParticipant.deleteMany({ where: { session_id: { in: ids } } });
    await prisma.session.deleteMany({ where: { id: { in: ids } } });
  }
  const batches = batchKeys.size
    ? await prisma.studentImportBatch.findMany({ where: { idempotency_key: { in: [...batchKeys] } }, select: { id: true } })
    : [];
  if (batches.length) {
    const batchIds = batches.map(({ id }) => id);
    await prisma.studentImportRow.deleteMany({ where: { batch_id: { in: batchIds } } });
    await prisma.studentImportBatch.deleteMany({ where: { id: { in: batchIds } } });
  }
  const idsToDelete = [...userIds];
  if (idsToDelete.length) {
    await prisma.accountSetupToken.deleteMany({ where: { user_id: { in: idsToDelete } } });
    await prisma.wallet.deleteMany({ where: { user_id: { in: idsToDelete } } });
    await prisma.user.deleteMany({ where: { id: { in: idsToDelete } } });
  }
  if (sourceIds.size) await prisma.referralSource.deleteMany({ where: { id: { in: [...sourceIds] } } });
  if (originalPolicy) {
    await prisma.platformPolicy.update({
      where: { id: 'default' },
      data: {
        check_in_window_hours: originalPolicy.check_in_window_hours,
        group_session_price: originalPolicy.group_session_price,
        private_session_price: originalPolicy.private_session_price,
        allow_overdraft: originalPolicy.allow_overdraft,
        default_tutor_hourly_rate: originalPolicy.default_tutor_hourly_rate,
        commission_enabled: originalPolicy.commission_enabled,
        commission_basis: originalPolicy.commission_basis,
        commission_rate_bps: originalPolicy.commission_rate_bps,
        commission_rule_version: originalPolicy.commission_rule_version,
        commission_updated_by_user_id: originalPolicy.commission_updated_by_user_id,
        commission_updated_at: originalPolicy.commission_updated_at,
      },
    });
  } else {
    await prisma.platformPolicy.deleteMany({ where: { id: 'default' } });
  }
}

describe('Iteration 003 financial and import database invariants', () => {
  beforeAll(async () => {
    originalPolicy = await prisma.platformPolicy.findUnique({ where: { id: 'default' } });
    const admin = await createUser('ADMIN', 'actor');
    adminId = admin.id;
    await ensureDirectSource();
    vi.mocked(requireAuth).mockResolvedValue({ userId: admin.id, email: admin.email!, name: admin.name!, role: 'ADMIN' });
    await setPolicy({ defaultRate: '0.00', commissionEnabled: false, commissionRateBps: 0 });
  });

  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: adminId, email: `${prefix}actor@example.com`, name: 'Test Admin', role: 'ADMIN' });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('settles Tutor pay and referral commission once, snapshots policy, and excludes historical sessions', async () => {
    const source = await createSource('referral');
    const tutor = await createUser('TUTOR', 'finance-tutor');
    const student = await createUser('STUDENT', 'finance-student', {
      referral_source: { connect: { id: source.id } },
      wallet: { create: { balance: new Prisma.Decimal('1000.00'), is_flagged_overdraft: false } },
    });
    await setPolicy({ defaultRate: '600.00', commissionEnabled: true, commissionRateBps: 1000, groupPrice: '375.00', ruleVersion: 12 });

    const now = new Date();
    const start = new Date(now.getTime() - 8 * 60 * 60_000);
    const end = new Date(start.getTime() + 2 * 60 * 60_000);
    const session = await createSession({ tutorId: tutor.id, studentId: student.id, title: 'settled', start, end });
    vi.mocked(requireAuth).mockResolvedValue({ userId: tutor.id, email: tutor.email!, name: tutor.name!, role: 'TUTOR' });
    const saveTime = new Date(start.getTime() + 60 * 60_000);
    expect((await saveTutorAttendance({ sessionId: session.id, presentStudentIds: [student.id], notes: 'Delivered and reviewed.' }, saveTime)).success).toBe(true);

    const historicalStart = new Date(start.getTime() - 10 * 60 * 60_000);
    const historicalEnd = new Date(historicalStart.getTime() + 2 * 60 * 60_000);
    const historical = await createSession({
      tutorId: tutor.id,
      studentId: student.id,
      title: 'historical',
      start: historicalStart,
      end: historicalEnd,
      historicalOnly: true,
      savedAt: new Date(historicalEnd.getTime() + 4 * 60 * 60_000),
    });

    const settlementTime = new Date(end.getTime() + 5 * 60 * 60_000);
    const dueCandidates = await prisma.session.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        historical_only: false,
        attendance_saved_at: { not: null },
        attendance_finalized_at: null,
      },
      select: { id: true, end_time: true },
    });
    const unrelatedDue = dueCandidates.filter((candidate) =>
      candidate.id !== session.id &&
      settlementTime.getTime() >= computeAttendanceClosesAt(candidate.end_time, 4).getTime()
    );
    if (unrelatedDue.length) {
      throw new Error(`Refusing to finalize unrelated due sessions in shared test DB: ${unrelatedDue.length}`);
    }
    expect(await finalizeDueAttendance({ checkInWindowHours: 4 }, settlementTime)).toEqual({ dueCount: 1, finalizedCount: 1 });
    expect(await finalizeDueAttendance({ checkInWindowHours: 4 }, settlementTime)).toEqual({ dueCount: 0, finalizedCount: 0 });

    const tutorEntry = await prisma.tutorCompensationLedgerEntry.findUniqueOrThrow({ where: { session_id: session.id } });
    const commissionEntry = await prisma.commissionLedgerEntry.findUniqueOrThrow({ where: { session_id_student_id: { session_id: session.id, student_id: student.id } } });
    const settledSession = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { user_id: student.id } });
    const charges = await prisma.walletTransaction.findMany({ where: { session_id: session.id, transaction_type: 'SESSION_DEDUCTION' } });
    expect(tutorEntry.tutor_id).toBe(tutor.id);
    expect(tutorEntry.delivered_minutes).toBe(120);
    expect(tutorEntry.hourly_rate.toFixed(2)).toBe('600.00');
    expect(tutorEntry.amount.toFixed(2)).toBe('1200.00');
    expect(commissionEntry).toMatchObject({
      student_id: student.id,
      recipient_source_id: source.id,
      recipient_source_name_snapshot: source.name,
      rate_bps: 1000,
      rule_version: 12,
    });
    expect(commissionEntry.basis_amount.toFixed(2)).toBe('375.00');
    expect(commissionEntry.amount.toFixed(2)).toBe('37.50');
    expect(settledSession.student_price_snapshot?.toFixed(2)).toBe('375.00');
    expect(wallet.balance.toFixed(2)).toBe('625.00');
    expect(charges).toHaveLength(1);

    vi.mocked(requireAuth).mockResolvedValue({ userId: adminId, email: `${prefix}actor@example.com`, name: 'Test Admin', role: 'ADMIN' });
    const detail = await getAdminFinanceSessionDetail(session.id);
    expect(detail).toMatchObject({
      id: session.id,
      status: 'COMPLETED',
      priceSnapshot: '375.00',
      tutor: { id: tutor.id },
      students: [{ id: student.id, attended: true }],
      compensation: { tutorId: tutor.id, deliveredMinutes: 120, hourlyRate: '600.00', amount: '1200.00' },
      charges: [{ studentId: student.id, amount: '-375.00', commission: {
        sourceId: source.id,
        sourceName: source.name,
        basisAmount: '375.00',
        rateBps: 1000,
        amount: '37.50',
        ruleVersion: 12,
      } }],
    });
    expect(await updatePlatformPolicies({
      checkInWindowHours: 4,
      groupSessionPrice: '500.00',
      privateSessionPrice: '700.00',
      allowOverdraft: true,
      defaultTutorHourlyRate: '900.00',
      commissionEnabled: true,
      commissionRateBps: 2500,
      commissionBasis: 'FINALIZED_SESSION_WALLET_CHARGE',
    })).toMatchObject({ success: true });
    const unchangedTutorEntry = await prisma.tutorCompensationLedgerEntry.findUniqueOrThrow({ where: { session_id: session.id } });
    const unchangedCommission = await prisma.commissionLedgerEntry.findUniqueOrThrow({ where: { session_id_student_id: { session_id: session.id, student_id: student.id } } });
    expect(unchangedTutorEntry.hourly_rate.toFixed(2)).toBe('600.00');
    expect(unchangedTutorEntry.amount.toFixed(2)).toBe('1200.00');
    expect(unchangedCommission.rate_bps).toBe(1000);
    expect(unchangedCommission.amount.toFixed(2)).toBe('37.50');

    const historicalState = await prisma.session.findUniqueOrThrow({ where: { id: historical.id } });
    expect(historicalState).toMatchObject({ status: 'SCHEDULED', historical_only: true, attendance_finalized_at: null });
    const historicalReconcile = await prisma.$transaction((tx) => reconcileSessionFinancialState(tx, {
      sessionId: historical.id,
      studentId: student.id,
      sessionType: 'GROUP',
      present: true,
      occurredAt: settlementTime,
    }));
    const historicalCompensation = await prisma.$transaction((tx) => accrueTutorCompensation(tx, historical.id, settlementTime));
    expect(historicalReconcile.historicalOnly).toBe(true);
    expect(historicalReconcile.commissionAccrued).toBe(false);
    expect(historicalReconcile.netSessionCharge.isZero()).toBe(true);
    expect(historicalCompensation).toBeNull();
    expect(await prisma.tutorCompensationLedgerEntry.findUnique({ where: { session_id: historical.id } })).toBeNull();
    expect(await prisma.commissionLedgerEntry.findFirst({ where: { session_id: historical.id } })).toBeNull();
    expect(await prisma.walletTransaction.count({ where: { session_id: historical.id } })).toBe(0);
  });

  it('keeps dry-run read-only and confirms matched updates/new pending Students with safe provenance', async () => {
    const source = await createSource('sales-referral', 'SALES');
    const existing = await createUser('STUDENT', 'existing-import', { name: 'Old Name', account_status: 'ACTIVE', password_hash: 'existing-hash' });
    const csvText = [
      'Name,Email,Phone,Source,Password',
      `New Name,${existing.email},${existing.phone},${source.name},should-not-be-imported`,
      `New Student,${prefix}new-import@example.com,+201099${process.pid},Direct,never-store-this`,
    ].join('\n');
    const mapping = { name: 'Name', email: 'Email', phone: 'Phone', referralSource: 'Source' };
    const idempotencyKey = randomUUID();
    batchKeys.add(idempotencyKey);
    const batchesBefore = await prisma.studentImportBatch.count({ where: { created_by_user_id: adminId } });
    const matchingUsersBefore = await prisma.user.count({ where: { email: { startsWith: prefix } } });
    const preview = await previewStudentImport({ csvText, mapping });
    expect(preview.counts).toEqual({ ready: 1, matched: 1, conflicts: 0, errors: 0 });
    expect(preview.rows[0]).toMatchObject({ status: 'MATCHED', matchedUserId: existing.id, changes: expect.arrayContaining([
      expect.objectContaining({ field: 'name', current: 'Old Name', next: 'New Name' }),
      expect.objectContaining({ field: 'source', current: 'None', next: source.name }),
    ]) });
    expect(await prisma.studentImportBatch.count({ where: { created_by_user_id: adminId } })).toBe(batchesBefore);
    expect(await prisma.user.count({ where: { email: { startsWith: prefix } } })).toBe(matchingUsersBefore);

    const confirmed = await confirmStudentImport({
      csvText,
      mapping,
      planDigest: preview.planDigest,
      idempotencyKey,
      rowActions: [
        { rowNumber: 2, action: 'UPDATE', expectedMatchUserId: existing.id },
        { rowNumber: 3, action: 'CREATE' },
      ],
    });
    expect(confirmed).toMatchObject({ created: 1, updated: 1, matched: 0, skipped: 0, conflicts: 0, errors: 0 });
    const batch = await prisma.studentImportBatch.findUniqueOrThrow({ where: { idempotency_key: idempotencyKey }, include: { rows: true } });
    expect(batch.created_by_user_id).toBe(adminId);
    expect(batch.rows.map((row) => ({ rowNumber: row.row_number, outcome: row.outcome, userId: row.matched_user_id }))).toEqual([
      { rowNumber: 2, outcome: 'UPDATED', userId: existing.id },
      { rowNumber: 3, outcome: 'CREATED', userId: expect.any(String) },
    ]);
    expect(JSON.stringify(batch.rows)).not.toContain(existing.email);
    expect(JSON.stringify(batch.rows)).not.toContain('never-store-this');
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(updated).toMatchObject({ name: 'New Name', referral_source_id: source.id, password_hash: 'existing-hash' });
    const newUserId = batch.rows.find((row) => row.outcome === 'CREATED')!.matched_user_id!;
    userIds.add(newUserId);
    const imported = await prisma.user.findUniqueOrThrow({ where: { id: newUserId } });
    expect(imported).toMatchObject({ role: 'STUDENT', account_status: 'PENDING_CREDENTIALS', password_hash: null, referral_source_id: directSourceId });
    const setup = await initiateAccountSetup(imported.id);
    const setupRecord = await prisma.accountSetupToken.findFirstOrThrow({ where: { user_id: imported.id, purpose: 'SETUP' } });
    expect(setupRecord.token_hash).not.toBe(setup.setupToken);
    expect(setupRecord.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await confirmStudentImport({
      csvText,
      mapping,
      planDigest: preview.planDigest,
      idempotencyKey,
      rowActions: [
        { rowNumber: 2, action: 'UPDATE', expectedMatchUserId: existing.id },
        { rowNumber: 3, action: 'CREATE' },
      ],
    })).toMatchObject({ batchId: batch.id, created: 1, updated: 1 });
    expect(await prisma.user.count({ where: { email: { startsWith: prefix } } })).toBe(matchingUsersBefore + 1);

    const invalidCsv = `Name,Email,Phone,Source\nDuplicate A,${prefix}dup@example.com,+20101111,Direct\nDuplicate B,${prefix}dup@example.com,+20102222,Direct\nBad Source,${prefix}bad-source@example.com,+20103333,Unknown source`;
    const invalidPreview = await previewStudentImport({ csvText: invalidCsv, mapping });
    expect(invalidPreview.counts).toEqual({ ready: 0, matched: 0, conflicts: 2, errors: 1 });
    const invalidKey = randomUUID();
    batchKeys.add(invalidKey);
    const invalidResult = await confirmStudentImport({
      csvText: invalidCsv,
      mapping,
      planDigest: invalidPreview.planDigest,
      idempotencyKey: invalidKey,
      rowActions: [2, 3, 4].map((rowNumber) => ({ rowNumber, action: 'SKIP' as const })),
    });
    expect(invalidResult).toMatchObject({ created: 0, updated: 0, skipped: 0, conflicts: 2, errors: 1 });
    const invalidBatch = await prisma.studentImportBatch.findUniqueOrThrow({ where: { idempotency_key: invalidKey }, include: { rows: true } });
    expect(invalidBatch.rows.map((row) => row.outcome)).toEqual(['CONFLICT', 'CONFLICT', 'INVALID']);
    expect(invalidBatch.rows.map((row) => row.reason_code)).toEqual(['duplicate_csv_identity', 'duplicate_csv_identity', 'unknown_referral_source']);
  });
});
