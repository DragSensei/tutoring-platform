import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for database-backed integration tests');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/shared/server/session', () => ({ requireAuth: vi.fn() }));

const { prisma } = await import('@/shared/lib/prisma');
const { requireAuth } = await import('@/shared/server/session');
const { generateStudentMonthlyReceivables, previewStudentMonthlyReceivables } = await import('@/features/finances/server/student-monthly-receivables');

const prefix = `test-monthly-receivables-${process.pid}-${randomUUID()}-`;
const users = new Set<string>();
const seriesIds = new Set<string>();
const relationshipIds = new Set<string>();
const policyIds = new Set<string>();
const studentIds = new Set<string>();
let adminId = '';
let tutorId = '';

async function createUser(role: 'ADMIN' | 'TUTOR' | 'STUDENT', name: string) {
  const user = await prisma.user.create({ data: { name: `${prefix}${name}`, email: `${prefix}${name}@example.com`, role, account_status: 'ACTIVE' } });
  users.add(user.id);
  if (role === 'STUDENT') studentIds.add(user.id);
  return user;
}

async function createStudents() {
  return Promise.all([createUser('STUDENT', 'Ahmed'), createUser('STUDENT', 'Mohamed')]);
}

async function createSeries(studentIds: string[], type: 'GROUP' | 'PRIVATE', startsOn: Date, endsOn: Date | null = null, status: 'ACTIVE' | 'ENDED' = 'ACTIVE') {
  const series = await prisma.sessionSeries.create({
    data: {
      tutor_id: tutorId, title: `${prefix}${type}-${seriesIds.size}`, session_type: type,
      weekday: 1, start_minute: 600, duration_minutes: 60, starts_on: startsOn, ends_on: endsOn, status,
      participants: { create: studentIds.map((student_id) => ({ student_id })) },
    },
  });
  seriesIds.add(series.id);
  return series;
}

async function linkStudents(students: Array<{ id: string }>, createdAt = new Date('2026-02-01T00:00:00.000Z')) {
  const [student_a_id, student_b_id] = students.map((student) => student.id).sort();
  const relation = await prisma.linkedStudentRelationship.create({ data: { student_a_id, student_b_id, created_by_admin_id: adminId, created_at: createdAt } });
  relationshipIds.add(relation.id);
  return relation;
}

async function price(effectiveFrom: string, group = '1500.00', privatePrice = '2200.00') {
  const policy = await prisma.studentMonthlyPricingPolicy.create({ data: {
    effective_from: new Date(`${effectiveFrom}T00:00:00.000Z`), group_monthly_price: new Prisma.Decimal(group),
    private_monthly_price: new Prisma.Decimal(privatePrice), created_by_admin_id: adminId,
  } });
  policyIds.add(policy.id);
  return policy;
}

const start = '2026-03-01';
const end = '2026-04-01';

beforeAll(async () => {
  const admin = await createUser('ADMIN', 'actor');
  const tutor = await createUser('TUTOR', 'tutor');
  adminId = admin.id;
  tutorId = tutor.id;
  vi.mocked(requireAuth).mockResolvedValue({ userId: adminId, email: admin.email!, name: admin.name!, role: 'ADMIN' });
});

beforeEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({ userId: adminId, email: `${prefix}actor@example.com`, name: 'Test Admin', role: 'ADMIN' });
});

afterEach(async () => {
  const ids = [...studentIds];
  if (ids.length) await prisma.studentMonthlyReceivable.deleteMany({ where: { student_id: { in: ids } } });
  if (relationshipIds.size) await prisma.linkedStudentRelationship.deleteMany({ where: { id: { in: [...relationshipIds] } } });
  if (seriesIds.size) {
    await prisma.sessionSeriesParticipant.deleteMany({ where: { series_id: { in: [...seriesIds] } } });
    await prisma.sessionSeries.deleteMany({ where: { id: { in: [...seriesIds] } } });
  }
  if (policyIds.size) await prisma.studentMonthlyPricingPolicy.deleteMany({ where: { id: { in: [...policyIds] } } });
  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
  for (const id of ids) users.delete(id);
  studentIds.clear(); relationshipIds.clear(); seriesIds.clear(); policyIds.clear();
});

afterAll(async () => {
  const ids = [...users];
  if (ids.length) await prisma.studentMonthlyReceivable.deleteMany({ where: { student_id: { in: ids } } });
  if (relationshipIds.size) await prisma.linkedStudentRelationship.deleteMany({ where: { id: { in: [...relationshipIds] } } });
  if (seriesIds.size) {
    await prisma.sessionSeriesParticipant.deleteMany({ where: { series_id: { in: [...seriesIds] } } });
    await prisma.sessionSeries.deleteMany({ where: { id: { in: [...seriesIds] } } });
  }
  if (policyIds.size) await prisma.studentMonthlyPricingPolicy.deleteMany({ where: { id: { in: [...policyIds] } } });
  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe('Student monthly receivable persistence', () => {
  it('generates two independent GROUP snapshots with exactly one 100 EGP discount each; retry is idempotent', async () => {
    const students = await createStudents();
    await linkStudents(students);
    await createSeries(students.map((student) => student.id), 'GROUP', new Date('2026-01-01T00:00:00.000Z'));
    await price(start);
    const before = await Promise.all([
      prisma.walletTransaction.count(), prisma.tutorCompensationLedgerEntry.count(), prisma.commissionLedgerEntry.count(),
    ]);
    const preview = await previewStudentMonthlyReceivables(start, end);
    expect(preview.success).toBe(true);
    if (!preview.success) return;
    expect(preview.rows.filter((row) => students.some((student) => student.id === row.studentId)).map(({ baseAmount, discountAmount, finalAmount }) => [baseAmount, discountAmount, finalAmount])).toEqual([
      ['1500.00', '100.00', '1400.00'], ['1500.00', '100.00', '1400.00'],
    ]);
    expect((await generateStudentMonthlyReceivables(start, end))).toMatchObject({ success: true, created: 2, alreadyExists: 0 });
    expect((await generateStudentMonthlyReceivables(start, end))).toMatchObject({ success: true, created: 0, alreadyExists: 2 });
    expect(await prisma.studentMonthlyReceivable.count({ where: { student_id: { in: students.map((student) => student.id) }, period_start: new Date(`${start}T00:00:00Z`), period_end: new Date(`${end}T00:00:00Z`) } })).toBe(2);
    expect(await Promise.all([prisma.walletTransaction.count(), prisma.tutorCompensationLedgerEntry.count(), prisma.commissionLedgerEntry.count()])).toEqual(before);
  });

  it('supports PRIVATE and GROUP prices in the same explicit period', async () => {
    const [privateStudent, groupStudent] = await createStudents();
    await linkStudents([privateStudent, groupStudent]);
    const privateSeries = await createSeries([privateStudent.id], 'PRIVATE', new Date('2026-01-01T00:00:00.000Z'));
    await createSeries([groupStudent.id], 'GROUP', new Date('2026-01-01T00:00:00.000Z'));
    await price(start, '1500.00', '2200.00');
    const preview = await previewStudentMonthlyReceivables(start, end);
    expect(preview.success).toBe(true);
    if (!preview.success) return;
    expect(preview.rows.filter((row) => [privateStudent.id, groupStudent.id].includes(row.studentId)).map(({ enrollment, baseAmount, discountAmount, finalAmount }) => [enrollment, baseAmount, discountAmount, finalAmount])).toEqual([
      ['PRIVATE', '2200.00', '100.00', '2100.00'], ['GROUP', '1500.00', '100.00', '1400.00'],
    ]);
    expect(await generateStudentMonthlyReceivables(start, end)).toMatchObject({ success: true, created: 2 });
    await prisma.sessionSeries.update({ where: { id: privateSeries.id }, data: { status: 'ENDED', ends_on: new Date('2026-03-31T00:00:00.000Z') } });
    await createSeries([privateStudent.id], 'PRIVATE', new Date(`${end}T00:00:00.000Z`));
    await price(end, '1800.00', '2600.00');
    const later = await previewStudentMonthlyReceivables(end, '2026-05-01');
    expect(later.success).toBe(true);
    if (!later.success) return;
    expect(later.rows.filter((row) => [privateStudent.id, groupStudent.id].includes(row.studentId)).map(({ enrollment, baseAmount, discountAmount, finalAmount }) => [enrollment, baseAmount, discountAmount, finalAmount])).toEqual([
      ['PRIVATE', '2600.00', '100.00', '2500.00'], ['GROUP', '1800.00', '100.00', '1700.00'],
    ]);
    expect(await generateStudentMonthlyReceivables(end, '2026-05-01')).toMatchObject({ success: true, created: 2 });
  });
  it('keeps generated snapshots unchanged after price and relationship changes', async () => {
    const students = await createStudents();
    const studentIdsForSnapshot = students.map((student) => student.id);
    const relationship = await linkStudents(students);
    await createSeries(studentIdsForSnapshot, 'GROUP', new Date('2026-01-01T00:00:00.000Z'));
    await price(start);
    await generateStudentMonthlyReceivables(start, end);
    const before = await prisma.studentMonthlyReceivable.findMany({ where: { student_id: { in: studentIdsForSnapshot } }, orderBy: { student_id: 'asc' } });
    await price(end, '1900.00', '2600.00');
    await prisma.linkedStudentRelationship.update({ where: { id: relationship.id }, data: { active: false, ended_at: new Date('2026-05-01T00:00:00.000Z'), ended_by_admin_id: adminId } });
    const after = await prisma.studentMonthlyReceivable.findMany({ where: { student_id: { in: studentIdsForSnapshot } }, orderBy: { student_id: 'asc' } });
    expect(after.map((row) => row.linked_relationship_id)).toEqual(before.map((row) => row.linked_relationship_id));
    expect(after.map((row) => [row.base_amount_snapshot.toFixed(2), row.linked_student_discount_snapshot.toFixed(2), row.final_amount.toFixed(2)])).toEqual(
      before.map((row) => [row.base_amount_snapshot.toFixed(2), row.linked_student_discount_snapshot.toFixed(2), row.final_amount.toFixed(2)]),
    );
  });

  it('blocks partial relationships, missing prices, and ambiguous GROUP/PRIVATE enrollment', async () => {
    const [partial, missing, ambiguous] = await Promise.all([createUser('STUDENT', 'partial'), createUser('STUDENT', 'missing'), createUser('STUDENT', 'ambiguous')]);
    const linked = await createUser('STUDENT', 'partial-linked');
    await linkStudents([partial, linked], new Date('2026-03-12Z'));
    await createSeries([partial.id], 'GROUP', new Date('2026-01-01Z'));
    await createSeries([linked.id], 'GROUP', new Date('2026-01-01Z'));
    await createSeries([missing.id], 'GROUP', new Date('2024-01-01T00:00:00.000Z'));
    await createSeries([ambiguous.id], 'GROUP', new Date('2026-01-01Z'));
    await createSeries([ambiguous.id], 'PRIVATE', new Date('2026-01-01Z'));
    await price(start);
    const noPrice = await previewStudentMonthlyReceivables('2025-01-01', '2025-02-01');
    expect(noPrice.success).toBe(true);
    if (noPrice.success) expect(noPrice.rows.find(({ studentId }) => studentId === missing.id)?.blockers).toContain('MISSING_PRICE');
    await generateStudentMonthlyReceivables('2025-01-01', '2025-02-01');
    expect(await prisma.studentMonthlyReceivable.count({ where: { student_id: missing.id } })).toBe(0);
    const result = await previewStudentMonthlyReceivables(start, end);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rows.find(({ studentId }) => studentId === partial.id)?.blockers).toContain('LINKED_RELATIONSHIP_REVIEW');
    expect(result.rows.find(({ studentId }) => studentId === missing.id)?.blockers).not.toContain('MISSING_PRICE');
    expect(result.rows.find(({ studentId }) => studentId === ambiguous.id)?.blockers).toContain('ENROLLMENT_REVIEW');
    expect((await generateStudentMonthlyReceivables(start, end)).success).toBe(true);
    expect(await prisma.studentMonthlyReceivable.count({ where: { student_id: { in: [partial.id, linked.id, missing.id, ambiguous.id] } } })).toBe(1);
  });

  it('prevents non-Admin generation and concurrent duplicate rows', async () => {
    const [first, second] = await createStudents();
    await createSeries([first.id, second.id], 'GROUP', new Date('2026-01-01Z'));
    await price(start);
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Admin authorization is required.'));
    await expect(generateStudentMonthlyReceivables(start, end)).rejects.toThrow('Admin authorization is required');
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Admin authorization is required.'));
    await expect(previewStudentMonthlyReceivables(start, end)).rejects.toThrow('Admin authorization is required');
    const results = await Promise.all([generateStudentMonthlyReceivables(start, end), generateStudentMonthlyReceivables(start, end)]);
    expect(results.some((result) => result.success)).toBe(true);
    expect(results.every((result) => result.success || ('conflict' in result && result.conflict))).toBe(true);
    expect(await prisma.studentMonthlyReceivable.count({ where: { student_id: { in: [first.id, second.id] } } })).toBe(2);
  });
});
