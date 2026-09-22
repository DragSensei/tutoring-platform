import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for database-backed integration tests');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: vi.fn() }));

const { prisma } = await import('@/shared/lib/prisma');
const { requireAuth } = await import('@/features/auth/server/session');
const { saveTutorAttendance } = await import('@/app/(portal)/tutor/attendance/actions');
const { finalizeDueAttendance } = await import('@/features/attendance/server/finalize-due-attendance');
const { executeStudentCheckIn } = await import('@/features/attendance/server/checkin-action');
const { getTutorSessions } = await import('@/features/sessions/server/session-actions');
const { getPlatformPolicies } = await import('@/features/policies/server/policy-actions');

const prefix = `test-final-attendance-${process.pid}-${Date.now()}-`;
let counter = 0;
const now = new Date('2026-10-01T12:00:00.000Z');
const policy = { checkInWindowHours: 4, groupSessionPrice: 375, privateSessionPrice: 500 };

async function createFixture(start: Date, end: Date) {
  const marker = `${prefix}${counter++}`;
  const tutor = await prisma.user.create({
    data: { name: `Tutor ${marker}`, email: `${marker}-tutor@example.com`, phone: `+20${Date.now()}${counter}`, password_hash: 'test', role: 'TUTOR' },
  });
  const student = await prisma.user.create({
    data: {
      name: `Student ${marker}`, email: `${marker}-student@example.com`, phone: `+20${Date.now()}${counter + 1}`, password_hash: 'test', role: 'STUDENT',
      wallet: { create: { balance: new Prisma.Decimal(1000), is_flagged_overdraft: false } },
    },
  });
  const session = await prisma.session.create({
    data: {
      title: `Final attendance ${marker}`, tutor_id: tutor.id, session_type: 'GROUP', start_time: start, end_time: end,
      deadline: new Date(end.getTime() + 4 * 60 * 60 * 1000), participants: { create: [{ student_id: student.id }] },
    },
  });
  return { tutor, student, session };
}

async function cleanup() {
  await prisma.session.deleteMany({ where: { title: { contains: prefix } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
}

async function walletState(studentId: string, sessionId: string) {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { user_id: studentId } });
  const transactions = await prisma.walletTransaction.findMany({ where: { wallet_id: wallet.id, session_id: sessionId } });
  return { balance: Number(wallet.balance), transactions };
}

describe('final Tutor attendance and settlement contract', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.platformPolicy.upsert({
      where: { id: 'default' },
      update: { check_in_window_hours: 4, group_session_price: 375, private_session_price: 500, allow_overdraft: true },
      create: { id: 'default', check_in_window_hours: 4, group_session_price: 375, private_session_price: 500, allow_overdraft: true },
    });
  });

  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'placeholder', email: 'placeholder@example.com', name: 'Placeholder', role: 'TUTOR' });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('rejects future attendance, opens exactly at start, and uses end plus policy grace', async () => {
    const fixture = await createFixture(new Date('2026-10-01T13:00:00.000Z'), new Date('2026-10-01T15:00:00.000Z'));
    vi.mocked(requireAuth).mockResolvedValue({ userId: fixture.tutor.id, email: fixture.tutor.email!, name: fixture.tutor.name!, role: 'TUTOR' });
    const before = await saveTutorAttendance({ sessionId: fixture.session.id, presentStudentIds: [fixture.student.id], notes: 'Too early to record.' }, new Date('2026-10-01T12:59:59.999Z'));
    expect(before.success).toBe(false);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(0);
    const atStart = await saveTutorAttendance({ sessionId: fixture.session.id, presentStudentIds: [fixture.student.id], notes: 'Attendance opened at start.' }, fixture.session.start_time);
    expect(atStart.success).toBe(true);
    const serialized = (await getTutorSessions(fixture.tutor.id, policy, fixture.session.start_time)).find((item) => item.id === fixture.session.id);
    expect(serialized?.attendanceClosesAt).toBe('2026-10-01T19:00:00.000Z');
  });

  it('allows edits through grace, charges only the final PRESENT state, and is idempotent', async () => {
    const fixture = await createFixture(new Date('2026-10-01T09:00:00.000Z'), new Date('2026-10-01T11:00:00.000Z'));
    const graceTime = new Date('2026-10-01T14:00:00.000Z');
    const close = new Date('2026-10-01T15:00:00.000Z');
    vi.mocked(requireAuth).mockResolvedValue({ userId: fixture.tutor.id, email: fixture.tutor.email!, name: fixture.tutor.name!, role: 'TUTOR' });
    expect((await saveTutorAttendance({ sessionId: fixture.session.id, presentStudentIds: [fixture.student.id], notes: 'Present during the workshop.' }, new Date('2026-10-01T10:00:00.000Z'))).success).toBe(true);
    expect((await saveTutorAttendance({ sessionId: fixture.session.id, presentStudentIds: [], notes: 'Final review marked the student absent.' }, graceTime)).success).toBe(true);
    expect((await walletState(fixture.student.id, fixture.session.id)).transactions).toHaveLength(0);
    const presentAgain = await saveTutorAttendance({ sessionId: fixture.session.id, presentStudentIds: [fixture.student.id], notes: 'Final review corrected to present.' }, graceTime);
    expect(presentAgain.success).toBe(true);
    const first = await finalizeDueAttendance(policy, new Date(close.getTime() + 1));
    const second = await finalizeDueAttendance(policy, new Date(close.getTime() + 1));
    expect(first.finalizedCount).toBe(1);
    expect(second.finalizedCount).toBe(0);
    const wallet = await walletState(fixture.student.id, fixture.session.id);
    expect(wallet.balance).toBe(625);
    expect(wallet.transactions.filter((entry) => entry.transaction_type === 'SESSION_DEDUCTION')).toHaveLength(1);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: fixture.session.id } })).status).toBe('COMPLETED');
  });

  it('settles ABSENT to zero and does not invent data when no review was saved', async () => {
    const absent = await createFixture(new Date('2026-10-01T08:00:00.000Z'), new Date('2026-10-01T10:00:00.000Z'));
    vi.mocked(requireAuth).mockResolvedValue({ userId: absent.tutor.id, email: absent.tutor.email!, name: absent.tutor.name!, role: 'TUTOR' });
    expect((await saveTutorAttendance({ sessionId: absent.session.id, presentStudentIds: [], notes: 'The roster was reviewed and absent.' }, new Date('2026-10-01T09:00:00.000Z'))).success).toBe(true);
    const absentResult = await finalizeDueAttendance(policy, new Date('2026-10-01T14:00:01.000Z'));
    expect(absentResult.finalizedCount).toBe(1);
    expect((await walletState(absent.student.id, absent.session.id)).transactions).toHaveLength(0);

    const missed = await createFixture(new Date('2026-10-01T06:00:00.000Z'), new Date('2026-10-01T08:00:00.000Z'));
    const missedResult = await finalizeDueAttendance(policy, new Date('2026-10-01T12:00:01.000Z'));
    expect(missedResult.dueCount).toBe(0);
    expect((await walletState(missed.student.id, missed.session.id)).transactions).toHaveLength(0);
    const tutorSessions = await getTutorSessions(missed.tutor.id, policy, new Date('2026-10-01T12:00:01.000Z'));
    expect(tutorSessions.find((item) => item.id === missed.session.id)).toMatchObject({ attendanceWindowState: 'CLOSED', attendanceSavedAt: null });
  });

  it('rejects the wrong Tutor and disables the Student mutation boundary', async () => {
    const fixture = await createFixture(new Date('2026-10-01T09:00:00.000Z'), new Date('2026-10-01T11:00:00.000Z'));
    const wrongTutor = await prisma.user.create({ data: { name: `Wrong ${prefix}`, email: `${prefix}wrong@example.com`, phone: `+20${Date.now()}99`, role: 'TUTOR' } });
    vi.mocked(requireAuth).mockResolvedValue({ userId: wrongTutor.id, email: wrongTutor.email!, name: wrongTutor.name!, role: 'TUTOR' });
    const wrong = await saveTutorAttendance({ sessionId: fixture.session.id, presentStudentIds: [fixture.student.id], notes: 'Wrong Tutor attempt.' }, new Date('2026-10-01T10:00:00.000Z'));
    expect(wrong.success).toBe(false);
    const studentMutation = await executeStudentCheckIn({ token: 'historical-token', studentId: fixture.student.id, currentTime: now });
    expect(studentMutation).toMatchObject({ success: false, statusCode: 410 });
  });

  it('keeps concurrent finalization to one net charge', async () => {
    const fixture = await createFixture(new Date('2026-10-01T09:00:00.000Z'), new Date('2026-10-01T11:00:00.000Z'));
    vi.mocked(requireAuth).mockResolvedValue({ userId: fixture.tutor.id, email: fixture.tutor.email!, name: fixture.tutor.name!, role: 'TUTOR' });
    await saveTutorAttendance({ sessionId: fixture.session.id, presentStudentIds: [fixture.student.id], notes: 'Concurrent finalizer fixture.' }, new Date('2026-10-01T10:00:00.000Z'));
    const [one, two] = await Promise.all([
      finalizeDueAttendance(policy, new Date('2026-10-01T15:00:01.000Z')),
      finalizeDueAttendance(policy, new Date('2026-10-01T15:00:01.000Z')),
    ]);
    expect(one.finalizedCount + two.finalizedCount).toBe(1);
    expect((await walletState(fixture.student.id, fixture.session.id)).transactions.filter((entry) => entry.transaction_type === 'SESSION_DEDUCTION')).toHaveLength(1);
  });
});
