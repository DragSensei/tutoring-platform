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
const { saveTutorAttendanceDraft, submitTutorAttendance } = await import('@/app/(portal)/tutor/attendance/actions');
const { finalizeDueAttendance } = await import('@/features/attendance/server/finalize-due-attendance');
const { executeStudentCheckIn } = await import('@/features/attendance/server/checkin-action');
const { getAdminAttendanceInterventionBoard, grantLateAttendanceRecovery, markAdminAttendanceHandled } = await import('@/features/attendance/server/admin-attendance');
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
  const sessions = await prisma.session.findMany({ where: { title: { contains: prefix } }, select: { id: true } });
  await prisma.attendanceRecoveryGrant.deleteMany({ where: { session_id: { in: sessions.map(({ id }) => id) } } });
  await prisma.session.deleteMany({ where: { title: { contains: prefix } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
}

async function createAdmin() {
  const marker = `${prefix}${counter++}`;
  return prisma.user.create({
    data: { name: `Admin ${marker}`, email: `${marker}-admin@example.com`, phone: `+20${Date.now()}${counter}`, password_hash: 'test', role: 'ADMIN' },
  });
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
    const outcomes = { [fixture.student.id]: 'PRESENT' as const };
    const before = await submitTutorAttendance({ sessionId: fixture.session.id, outcomes, notes: 'Too early to record.', normalEvidenceSelected: true }, new Date('2026-10-01T12:59:59.999Z'));
    expect(before.success).toBe(false);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(0);
    const atStart = await saveTutorAttendanceDraft({ sessionId: fixture.session.id, outcomes, notes: 'Attendance opened at start.' }, fixture.session.start_time);
    expect(atStart.success).toBe(true);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(0);
    const tooEarlyToSubmit = await submitTutorAttendance({ sessionId: fixture.session.id, outcomes, notes: 'Attendance cannot submit during class.', normalEvidenceSelected: true }, fixture.session.start_time);
    expect(tooEarlyToSubmit.success).toBe(false);
    const submitted = await submitTutorAttendance({ sessionId: fixture.session.id, outcomes, notes: 'Attendance submitted after class.', normalEvidenceSelected: true }, fixture.session.end_time);
    expect(submitted.success).toBe(true);
    const serialized = (await getTutorSessions(fixture.tutor.id, policy, fixture.session.start_time)).find((item) => item.id === fixture.session.id);
    expect(serialized?.attendanceClosesAt).toBe('2026-10-01T19:00:00.000Z');
    expect(serialized?.attendanceSubmittedAt).toBe(fixture.session.end_time.toISOString());
  });

  it('allows edits through grace, charges only the final PRESENT state, and is idempotent', async () => {
    const fixture = await createFixture(new Date('2026-10-01T09:00:00.000Z'), new Date('2026-10-01T11:00:00.000Z'));
    const graceTime = new Date('2026-10-01T14:00:00.000Z');
    const close = new Date('2026-10-01T15:00:00.000Z');
    vi.mocked(requireAuth).mockResolvedValue({ userId: fixture.tutor.id, email: fixture.tutor.email!, name: fixture.tutor.name!, role: 'TUTOR' });
    expect((await saveTutorAttendanceDraft({ sessionId: fixture.session.id, outcomes: { [fixture.student.id]: 'PRESENT' }, notes: 'Present during the workshop.' }, new Date('2026-10-01T10:00:00.000Z'))).success).toBe(true);
    expect((await saveTutorAttendanceDraft({ sessionId: fixture.session.id, outcomes: { [fixture.student.id]: 'ABSENT' }, notes: 'Final review marked the student absent.' }, graceTime)).success).toBe(true);
    expect((await walletState(fixture.student.id, fixture.session.id)).transactions).toHaveLength(0);
    const presentAgain = await submitTutorAttendance({ sessionId: fixture.session.id, outcomes: { [fixture.student.id]: 'PRESENT' }, notes: 'Final review corrected to present.', normalEvidenceSelected: true }, graceTime);
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
    expect((await saveTutorAttendanceDraft({ sessionId: absent.session.id, outcomes: { [absent.student.id]: 'ABSENT' }, notes: 'The roster was reviewed and absent.' }, new Date('2026-10-01T09:00:00.000Z'))).success).toBe(true);
    expect((await submitTutorAttendance({ sessionId: absent.session.id, outcomes: { [absent.student.id]: 'ABSENT' }, notes: 'The roster was reviewed and absent.', normalEvidenceSelected: true }, new Date('2026-10-01T10:00:00.000Z'))).success).toBe(true);
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
    const wrong = await saveTutorAttendanceDraft({ sessionId: fixture.session.id, outcomes: { [fixture.student.id]: 'PRESENT' }, notes: 'Wrong Tutor attempt.' }, new Date('2026-10-01T10:00:00.000Z'));
    expect(wrong.success).toBe(false);
    const studentMutation = await executeStudentCheckIn({ token: 'historical-token', studentId: fixture.student.id, currentTime: now });
    expect(studentMutation).toMatchObject({ success: false, statusCode: 410 });
  });

  it('keeps concurrent finalization to one net charge', async () => {
    const fixture = await createFixture(new Date('2026-10-01T09:00:00.000Z'), new Date('2026-10-01T11:00:00.000Z'));
    vi.mocked(requireAuth).mockResolvedValue({ userId: fixture.tutor.id, email: fixture.tutor.email!, name: fixture.tutor.name!, role: 'TUTOR' });
    await saveTutorAttendanceDraft({ sessionId: fixture.session.id, outcomes: { [fixture.student.id]: 'PRESENT' }, notes: 'Concurrent finalizer fixture.' }, new Date('2026-10-01T10:00:00.000Z'));
    await submitTutorAttendance({ sessionId: fixture.session.id, outcomes: { [fixture.student.id]: 'PRESENT' }, notes: 'Concurrent finalizer fixture.', normalEvidenceSelected: true }, new Date('2026-10-01T11:00:00.000Z'));
    const [one, two] = await Promise.all([
      finalizeDueAttendance(policy, new Date('2026-10-01T15:00:01.000Z')),
      finalizeDueAttendance(policy, new Date('2026-10-01T15:00:01.000Z')),
    ]);
    expect(one.finalizedCount + two.finalizedCount).toBe(1);
    expect((await walletState(fixture.student.id, fixture.session.id)).transactions.filter((entry) => entry.transaction_type === 'SESSION_DEDUCTION')).toHaveLength(1);
  });

  it('persists one Admin recovery intervention, lists it as handled, and rejects repeats', async () => {
    const fixture = await createFixture(new Date('2026-10-01T06:00:00.000Z'), new Date('2026-10-01T08:00:00.000Z'));
    const admin = await createAdmin();
    const handledAt = new Date('2026-10-01T18:00:00.000Z');
    const grant = await grantLateAttendanceRecovery(admin.id, fixture.session.id, 'Tutor reported a connection outage.', handledAt);
    expect(grant.closes_at).toEqual(new Date('2026-10-01T19:00:00.000Z'));
    await expect(grantLateAttendanceRecovery(admin.id, fixture.session.id, 'Try the recovery action again.', new Date('2026-10-01T20:00:00.000Z'))).rejects.toThrow('already been handled by Admin');
    expect(await prisma.attendanceRecoveryGrant.count({ where: { session_id: fixture.session.id } })).toBe(1);

    const board = await getAdminAttendanceInterventionBoard(handledAt);
    expect(board.needsAction.some(({ id }) => id === fixture.session.id)).toBe(false);
    expect(board.handled.find(({ id }) => id === fixture.session.id)).toMatchObject({ recoveryWindowActive: true, adminName: admin.name });

    const cutoff = new Date(handledAt.getTime() - 30 * 24 * 60 * 60 * 1000);
    await prisma.session.update({ where: { id: fixture.session.id }, data: { admin_attendance_handled_at: cutoff } });
    await prisma.attendanceRecoveryGrant.update({ where: { id: grant.id }, data: { opened_at: cutoff, closes_at: new Date(cutoff.getTime() + 60 * 60 * 1000) } });
    const atBoundary = await getAdminAttendanceInterventionBoard(handledAt);
    expect(atBoundary.handled.find(({ id }) => id === fixture.session.id)).toMatchObject({ openedAt: cutoff.toISOString(), recoveryWindowActive: false });
    await prisma.session.update({ where: { id: fixture.session.id }, data: { admin_attendance_handled_at: new Date(cutoff.getTime() - 1) } });
    await prisma.attendanceRecoveryGrant.update({ where: { id: grant.id }, data: { opened_at: new Date(cutoff.getTime() - 1) } });
    const outsideWindow = await getAdminAttendanceInterventionBoard(handledAt);
    expect(outsideWindow.handled.some(({ id }) => id === fixture.session.id)).toBe(false);
    expect(outsideWindow.needsAction.some(({ id }) => id === fixture.session.id)).toBe(false);
  });

  it('serializes simultaneous Admin recovery submissions into one durable grant', async () => {
    const fixture = await createFixture(new Date('2026-10-01T06:00:00.000Z'), new Date('2026-10-01T08:00:00.000Z'));
    const admin = await createAdmin();
    const handledAt = new Date('2026-10-01T18:00:00.000Z');
    const results = await Promise.allSettled([
      grantLateAttendanceRecovery(admin.id, fixture.session.id, 'Tutor reported a connection outage.', handledAt),
      grantLateAttendanceRecovery(admin.id, fixture.session.id, 'Tutor reported a connection outage.', handledAt),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await prisma.attendanceRecoveryGrant.count({ where: { session_id: fixture.session.id } })).toBe(1);
  });

  it('records no-window resolutions in handled history and rejects later recovery', async () => {
    const fixture = await createFixture(new Date('2026-10-01T06:00:00.000Z'), new Date('2026-10-01T08:00:00.000Z'));
    const admin = await createAdmin();
    const handledAt = new Date('2026-10-01T18:00:00.000Z');
    await markAdminAttendanceHandled(admin.id, fixture.session.id, 'Resolved the dispute with the Tutor.', handledAt);
    await expect(markAdminAttendanceHandled(admin.id, fixture.session.id, 'Tried to mark it again.', new Date('2026-10-01T19:00:00.000Z'))).rejects.toThrow('already been handled by Admin');
    await expect(grantLateAttendanceRecovery(admin.id, fixture.session.id, 'Try a recovery grant anyway.', new Date('2026-10-01T20:00:00.000Z'))).rejects.toThrow('already been handled by Admin');
    expect(await prisma.attendanceRecoveryGrant.count({ where: { session_id: fixture.session.id } })).toBe(0);
    const board = await getAdminAttendanceInterventionBoard(handledAt);
    expect(board.needsAction.some(({ id }) => id === fixture.session.id)).toBe(false);
    expect(board.handled.find(({ id }) => id === fixture.session.id)).toMatchObject({
      interventionKind: 'ADMIN_RESOLVED', recoveryWindowActive: false, closesAt: null,
      adminName: admin.name, adminReason: 'Resolved the dispute with the Tutor.',
    });
  });

  it('serializes competing mark-handled and recovery submissions to one Admin intervention', async () => {
    const fixture = await createFixture(new Date('2026-10-01T06:00:00.000Z'), new Date('2026-10-01T08:00:00.000Z'));
    const admin = await createAdmin();
    const handledAt = new Date('2026-10-01T18:00:00.000Z');
    const results = await Promise.allSettled([
      markAdminAttendanceHandled(admin.id, fixture.session.id, 'Resolved the dispute with the Tutor.', handledAt),
      grantLateAttendanceRecovery(admin.id, fixture.session.id, 'Tutor reported a connection outage.', handledAt),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const [session, grantCount] = await Promise.all([
      prisma.session.findUniqueOrThrow({ where: { id: fixture.session.id }, select: { admin_attendance_handled_at: true, admin_attendance_handling_note: true } }),
      prisma.attendanceRecoveryGrant.count({ where: { session_id: fixture.session.id } }),
    ]);
    expect(session.admin_attendance_handled_at).not.toBeNull();
    expect(session.admin_attendance_handling_note).toBeTruthy();
    expect(grantCount).toBeLessThanOrEqual(1);
  });
});
