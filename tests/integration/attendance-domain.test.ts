import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/tutoring_platform_db?schema=public';
process.env.DIRECT_URL ||= process.env.DATABASE_URL;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: vi.fn() }));

const { prisma } = await import('@/shared/lib/prisma');
const { requireAuth } = await import('@/features/auth/server/session');
const { executeStudentCheckIn } = await import('@/features/attendance/server/checkin-action');
const { saveTutorAttendance } = await import('@/app/(portal)/tutor/attendance/actions');
const { createAdminSession } = await import('@/app/(portal)/admin/gadwal/actions');
const { createSession, getTutorSessions } = await import('@/features/sessions/server/session-actions');
const { adminRefund } = await import('@/features/wallets/server/wallet-actions');

const marker = `domain-${Date.now()}`;
let fixtureCounter = 0;
let originalPolicy: Awaited<ReturnType<typeof prisma.platformPolicy.findUnique>>;

async function createFixture(participantCount = 3, sessionType: 'PRIVATE' | 'GROUP' = 'GROUP') {
  const fixtureMarker = `${marker}-${fixtureCounter++}`;
  const tutor = await prisma.user.create({
    data: {
      name: `Tutor ${fixtureMarker}`,
      email: `${fixtureMarker}-tutor@example.com`,
      phone: `+20${Date.now()}1`,
      password_hash: 'test',
      role: 'TUTOR',
    },
  });
  const students = await Promise.all(
    Array.from({ length: participantCount }, (_, index) =>
      prisma.user.create({
        data: {
          name: `Student ${fixtureMarker}-${index}`,
          email: `${fixtureMarker}-student-${index}@example.com`,
          phone: `+20${Date.now()}${index + 2}`,
          password_hash: 'test',
          role: 'STUDENT',
          wallet: { create: { balance: new Prisma.Decimal(1000), is_flagged_overdraft: false } },
        },
      })
    )
  );
  const now = new Date();
  const session = await prisma.session.create({
    data: {
      title: `Domain session ${marker}`,
      tutor_id: tutor.id,
      session_type: sessionType,
      start_time: new Date(now.getTime() - 60 * 60 * 1000),
      end_time: new Date(now.getTime() + 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      status: 'ACTIVE',
      participants: { create: students.map((student) => ({ student_id: student.id })) },
    },
  });
  return { tutor, students, session, now };
}

async function walletState(studentId: string, sessionId: string) {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { user_id: studentId } });
  const transactions = await prisma.walletTransaction.findMany({
    where: { wallet_id: wallet.id, session_id: sessionId },
    orderBy: { created_at: 'asc' },
  });
  return { balance: Number(wallet.balance), transactions };
}

describe('durable attendance domain invariants', () => {
  beforeAll(async () => {
    originalPolicy = await prisma.platformPolicy.findUnique({ where: { id: 'default' } });
    await prisma.platformPolicy.upsert({
      where: { id: 'default' },
      update: { group_session_price: 375, private_session_price: 500, allow_overdraft: true },
      create: { id: 'default', group_session_price: 375, private_session_price: 500, allow_overdraft: true },
    });
  });

  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'placeholder',
      email: 'placeholder@example.com',
      name: 'Placeholder',
      role: 'TUTOR',
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: {
        OR: [
          { title: { startsWith: `Domain session ${marker}` } },
          { title: { startsWith: `Created session ${marker}` } },
          { title: { startsWith: `Authorized session ${marker}` } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
    if (originalPolicy) {
      await prisma.platformPolicy.update({
        where: { id: 'default' },
        data: {
          check_in_window_hours: originalPolicy.check_in_window_hours,
          group_session_price: originalPolicy.group_session_price,
          private_session_price: originalPolicy.private_session_price,
          allow_overdraft: originalPolicy.allow_overdraft,
        },
      });
    } else {
      await prisma.platformPolicy.delete({ where: { id: 'default' } });
    }
    await prisma.$disconnect();
  });

  it('uses durable PRIVATE/GROUP participants as the Tutor roster', async () => {
    const groupFixture = await createFixture(3, 'GROUP');
    const privateFixture = await createFixture(1, 'PRIVATE');
    const groupSessions = await getTutorSessions(groupFixture.tutor.id);
    const privateSessions = await getTutorSessions(privateFixture.tutor.id);
    const groupSession = groupSessions.find((item) => item.id === groupFixture.session.id);
    const privateSession = privateSessions.find((item) => item.id === privateFixture.session.id);

    expect(groupSession?.roster?.map((student) => student.id)).toEqual(
      groupFixture.students.map((student) => student.id)
    );
    expect(privateSession?.roster?.map((student) => student.id)).toEqual(
      privateFixture.students.map((student) => student.id)
    );
  });

  it('requires explicit Student assignments when creating a session', async () => {
    const fixture = await createFixture(2);
    const created = await createSession({
      title: `Created session ${marker}`,
      tutorId: fixture.tutor.id,
      sessionType: 'GROUP',
      participantIds: fixture.students.map((student) => student.id),
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: created.id },
      orderBy: { student_id: 'asc' },
    });
    expect(participants.map((participant) => participant.student_id)).toEqual(
      [...fixture.students.map((student) => student.id)].sort()
    );
    await expect(
      createSession({
        title: `Invalid session ${marker}`,
        tutorId: fixture.tutor.id,
        sessionType: 'PRIVATE',
        participantIds: [],
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      })
    ).rejects.toThrow('Private sessions require exactly one student');
  });

  it('requires Admin authorization before accepting session assignments', async () => {
    const fixture = await createFixture(1);
    const input = {
      title: `Authorized session ${marker}`,
      tutorId: fixture.tutor.id,
      sessionType: 'PRIVATE' as const,
      participantIds: [fixture.students[0].id],
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    };

    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(createAdminSession(input)).rejects.toThrow('Unauthorized');

    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Forbidden: Insufficient privileges'));
    await expect(createAdminSession(input)).rejects.toThrow('Forbidden');

    expect(
      await prisma.session.count({ where: { title: input.title } })
    ).toBe(0);
  });

  it('rejects a foreign Student before attendance or financial mutation', async () => {
    const fixture = await createFixture(2);
    const foreign = await prisma.user.create({
      data: {
        name: `Foreign ${marker}`,
        email: `${marker}-foreign@example.com`,
        phone: `+20${Date.now()}9`,
        password_hash: 'test',
        role: 'STUDENT',
        wallet: { create: { balance: new Prisma.Decimal(1000), is_flagged_overdraft: false } },
      },
    });
    vi.mocked(requireAuth).mockResolvedValue({
      userId: fixture.tutor.id,
      email: fixture.tutor.email,
      name: fixture.tutor.name,
      role: 'TUTOR',
    });

    const result = await saveTutorAttendance({
      sessionId: fixture.session.id,
      presentStudentIds: [foreign.id],
      notes: 'Foreign participant must be rejected.',
    });

    expect(result.success).toBe(false);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(0);
    expect((await walletState(foreign.id, fixture.session.id)).transactions).toHaveLength(0);
  });

  it('reconciles check-in, mixed attendance, all absent, and repeated edits to one net charge', async () => {
    const fixture = await createFixture(3);
    vi.mocked(requireAuth).mockResolvedValue({
      userId: fixture.tutor.id,
      email: fixture.tutor.email,
      name: fixture.tutor.name,
      role: 'TUTOR',
    });

    const checkIn = await executeStudentCheckIn({
      token: fixture.session.token,
      studentId: fixture.students[0].id,
      currentTime: fixture.now,
    });
    expect(checkIn.success).toBe(true);

    const absentResult = await saveTutorAttendance({
      sessionId: fixture.session.id,
      presentStudentIds: [],
      notes: 'Everyone was absent at final review.',
    });
    expect(absentResult.success).toBe(true);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(0);
    const afterAbsent = await walletState(fixture.students[0].id, fixture.session.id);
    expect(afterAbsent.transactions.map((transaction) => transaction.transaction_type)).toEqual([
      'SESSION_DEDUCTION',
      'REFUND',
    ]);
    expect(afterAbsent.balance).toBe(1000);

    const presentResult = await saveTutorAttendance({
      sessionId: fixture.session.id,
      presentStudentIds: [fixture.students[0].id, fixture.students[1].id],
      notes: 'Two students completed the reviewed session.',
    });
    expect(presentResult.success).toBe(true);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(2);

    const repeatedResult = await saveTutorAttendance({
      sessionId: fixture.session.id,
      presentStudentIds: [fixture.students[0].id, fixture.students[1].id],
      notes: 'Two students completed the reviewed session.',
    });
    expect(repeatedResult).toEqual(presentResult);

    const firstStudent = await walletState(fixture.students[0].id, fixture.session.id);
    const secondStudent = await walletState(fixture.students[1].id, fixture.session.id);
    const thirdStudent = await walletState(fixture.students[2].id, fixture.session.id);
    expect(firstStudent.transactions.map((transaction) => transaction.transaction_type)).toEqual([
      'SESSION_DEDUCTION',
      'REFUND',
      'SESSION_DEDUCTION',
    ]);
    expect(firstStudent.balance).toBe(625);
    expect(secondStudent.transactions).toHaveLength(1);
    expect(Number(secondStudent.transactions[0].amount)).toBe(-375);
    expect(thirdStudent.transactions).toHaveLength(0);

    const completed = await prisma.session.findUniqueOrThrow({ where: { id: fixture.session.id } });
    expect(completed.status).toBe('COMPLETED');

    const afterFinalizationCheckIn = await executeStudentCheckIn({
      token: fixture.session.token,
      studentId: fixture.students[2].id,
      currentTime: fixture.now,
    });
    expect(afterFinalizationCheckIn.success).toBe(false);
    expect(afterFinalizationCheckIn.statusCode).toBe(409);
  });

  it('preserves an independent Admin refund during Tutor PRESENT finalization', async () => {
    const fixture = await createFixture(1);
    const admin = await prisma.user.create({
      data: {
        name: `Admin ${marker}`,
        email: `${marker}-admin@example.com`,
        phone: `+20${Date.now()}7`,
        password_hash: 'test',
        role: 'ADMIN',
      },
    });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { user_id: fixture.students[0].id } });

    const checkIn = await executeStudentCheckIn({
      token: fixture.session.token,
      studentId: fixture.students[0].id,
      currentTime: fixture.now,
    });
    expect(checkIn.success).toBe(true);

    const adminRefundResult = await adminRefund({
      walletId: wallet.id,
      amount: 100,
      sessionId: fixture.session.id,
      adminUserId: admin.id,
    });
    expect(adminRefundResult.newBalance).toBe(725);

    vi.mocked(requireAuth).mockResolvedValue({
      userId: fixture.tutor.id,
      email: fixture.tutor.email,
      name: fixture.tutor.name,
      role: 'TUTOR',
    });
    const finalized = await saveTutorAttendance({
      sessionId: fixture.session.id,
      presentStudentIds: [fixture.students[0].id],
      notes: 'Present after independent account adjustment.',
    });
    expect(finalized.success).toBe(true);

    const afterFinalization = await walletState(fixture.students[0].id, fixture.session.id);
    expect(afterFinalization.balance).toBe(725);
    expect(afterFinalization.transactions).toHaveLength(2);
    expect(afterFinalization.transactions.filter((transaction) => transaction.transaction_type === 'SESSION_DEDUCTION')).toHaveLength(1);
    expect(
      afterFinalization.transactions.filter(
        (transaction) => transaction.transaction_type === 'REFUND' && transaction.created_by_user_id === admin.id
      )
    ).toHaveLength(1);
    expect(
      afterFinalization.transactions
        .filter(
          (transaction) =>
            transaction.transaction_type === 'SESSION_DEDUCTION' ||
            (transaction.transaction_type === 'REFUND' && transaction.created_by_user_id === null)
        )
        .reduce((total, transaction) => total + Number(transaction.amount), 0)
    ).toBe(-375);
  });

  it('serializes simultaneous Student check-ins to one net session charge', async () => {
    const fixture = await createFixture(1);
    const outcomes = await Promise.all([
      executeStudentCheckIn({
        token: fixture.session.token,
        studentId: fixture.students[0].id,
        currentTime: fixture.now,
      }),
      executeStudentCheckIn({
        token: fixture.session.token,
        studentId: fixture.students[0].id,
        currentTime: fixture.now,
      }),
    ]);

    expect(outcomes.filter((outcome) => outcome.success)).toHaveLength(1);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(1);
    const afterConcurrentCheckIn = await walletState(fixture.students[0].id, fixture.session.id);
    expect(afterConcurrentCheckIn.transactions.filter((transaction) => transaction.transaction_type === 'SESSION_DEDUCTION')).toHaveLength(1);
    expect(afterConcurrentCheckIn.balance).toBe(625);
  });

  it('keeps simultaneous Tutor finalization attempts to one net session charge', async () => {
    const fixture = await createFixture(1);
    vi.mocked(requireAuth).mockResolvedValue({
      userId: fixture.tutor.id,
      email: fixture.tutor.email,
      name: fixture.tutor.name,
      role: 'TUTOR',
    });

    const outcomes = await Promise.all([
      saveTutorAttendance({
        sessionId: fixture.session.id,
        presentStudentIds: [fixture.students[0].id],
        notes: 'Concurrent finalization attempt A.',
      }),
      saveTutorAttendance({
        sessionId: fixture.session.id,
        presentStudentIds: [fixture.students[0].id],
        notes: 'Concurrent finalization attempt B.',
      }),
    ]);

    expect(outcomes.some((outcome) => outcome.success)).toBe(true);
    const afterConcurrentFinalization = await walletState(fixture.students[0].id, fixture.session.id);
    expect(afterConcurrentFinalization.transactions.filter((transaction) => transaction.transaction_type === 'SESSION_DEDUCTION')).toHaveLength(1);
    expect(afterConcurrentFinalization.balance).toBe(625);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(1);
  });

  it('rejects the wrong Tutor and cancelled sessions without mutation', async () => {
    const fixture = await createFixture(1);
    const otherTutor = await prisma.user.create({
      data: {
        name: `Other tutor ${marker}`,
        email: `${marker}-other-tutor@example.com`,
        phone: `+20${Date.now()}8`,
        password_hash: 'test',
        role: 'TUTOR',
      },
    });
    vi.mocked(requireAuth).mockResolvedValue({
      userId: otherTutor.id,
      email: otherTutor.email,
      name: otherTutor.name,
      role: 'TUTOR',
    });
    const wrongTutor = await saveTutorAttendance({
      sessionId: fixture.session.id,
      presentStudentIds: [fixture.students[0].id],
      notes: 'This Tutor does not own the session.',
    });
    expect(wrongTutor.success).toBe(false);

    await prisma.session.update({ where: { id: fixture.session.id }, data: { status: 'CANCELLED' } });
    vi.mocked(requireAuth).mockResolvedValue({
      userId: fixture.tutor.id,
      email: fixture.tutor.email,
      name: fixture.tutor.name,
      role: 'TUTOR',
    });
    const cancelled = await saveTutorAttendance({
      sessionId: fixture.session.id,
      presentStudentIds: [],
      notes: 'Cancelled sessions cannot be finalized.',
    });
    expect(cancelled.success).toBe(false);
    expect(await prisma.attendanceRecord.count({ where: { session_id: fixture.session.id } })).toBe(0);
  });
});
