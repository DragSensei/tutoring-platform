import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuth = vi.fn();
const policy = {
  checkInWindowHours: 4,
  groupSessionPrice: 410,
  privateSessionPrice: 620,
  allowOverdraft: true,
};
const prisma = {
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  session: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
  sessionSeries: { findMany: vi.fn().mockResolvedValue([]) },
  $transaction: vi.fn(),
};

vi.mock('@/features/auth/server/session', () => ({ requireAuth }));
vi.mock('@/features/policies/server/policy-actions', () => ({ getPlatformPolicies: vi.fn(async () => policy) }));
vi.mock('@/shared/lib/prisma', () => ({ prisma }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { createSession, updateSession, deleteSession, rescheduleSessionOccurrence, getTutorSessions } = await import('@/features/sessions/server/session-actions');
const { createAdminSession, cancelAdminSession } = await import('@/app/(portal)/admin/gadwal/actions');

const input = {
  title: 'Robotics fundamentals',
  tutorId: 'tutor-1',
  sessionType: 'PRIVATE' as const,
  participantIds: ['student-1'],
  startTime: '2026-10-01T10:00:00.000Z',
  endTime: '2026-10-01T12:00:00.000Z',
};

function createdSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    title: input.title,
    tutor_id: input.tutorId,
    session_type: input.sessionType,
    start_time: new Date(input.startTime),
    end_time: new Date(input.endTime),
    deadline: new Date('2026-10-01T14:00:00.000Z'),
    token: 'token-1',
    status: 'SCHEDULED',
    attendance_notes: null,
    tutor: { id: 'tutor-1', name: 'Omar Ashraf', email: 'omar@example.com' },
    participants: [{ student: { id: 'student-1', name: 'Karim Mostafa', email: 'karim@example.com' } }],
    _count: { attendances: 0, transactions: 0 },
    ...overrides,
  };
}

describe('Admin session mutation boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
    prisma.user.findUnique.mockResolvedValue({ id: 'tutor-1', role: 'TUTOR' });
    prisma.user.findMany.mockResolvedValue([{ id: 'student-1' }]);
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.session.create.mockResolvedValue(createdSession());
    prisma.session.update.mockResolvedValue(createdSession({ title: 'Updated robotics fundamentals' }));
  });

  it('requires ADMIN before reading references or creating a session', async () => {
    requireAuth.mockRejectedValueOnce(new Error('Forbidden: Insufficient privileges'));

    await expect(createAdminSession(input)).rejects.toThrow('Forbidden');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it('persists a valid PRIVATE session and returns the current policy price', async () => {
    const result = await createAdminSession(input);

    expect(prisma.session.create).toHaveBeenCalled();
    expect(result.price).toBe(620);
    expect(result.assignedStudents).toEqual(['Karim Mostafa']);
  });

  it('rejects PRIVATE sessions unless exactly one participant is assigned', async () => {
    await expect(createSession({ ...input, participantIds: [] }, policy)).rejects.toThrow('exactly one student');
    await expect(createSession({ ...input, participantIds: ['student-1', 'student-2'] }, policy)).rejects.toThrow('exactly one student');
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it('updates persisted session details through the same validation path', async () => {
    prisma.session.findUnique.mockResolvedValue({
      ...createdSession(),
      participants: [{ student_id: 'student-1' }],
      _count: { attendances: 0, transactions: 0 },
    });

    const result = await updateSession('session-1', { ...input, title: 'Updated robotics fundamentals' }, policy);

    expect(prisma.session.update).toHaveBeenCalled();
    expect(result.title).toBe('Updated robotics fundamentals');
  });

  it('hard-deletes only future sessions without attendance or financial history', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1',
      status: 'SCHEDULED',
      start_time: new Date(Date.now() + 3_600_000),
      _count: { attendances: 0, transactions: 0 },
    });

    await deleteSession('session-1');
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
  });

  it('refuses destructive deletion when history exists and exposes cancellation instead', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1',
      status: 'ACTIVE',
      start_time: new Date(Date.now() - 3_600_000),
      _count: { attendances: 1, transactions: 1 },
    });

    await expect(deleteSession('session-1')).rejects.toThrow('must be cancelled');
    expect(prisma.session.delete).not.toHaveBeenCalled();

    prisma.session.findUnique.mockResolvedValue({ id: 'session-1', status: 'ACTIVE' });
    await cancelAdminSession('session-1');
    expect(prisma.session.update).toHaveBeenCalledWith({ where: { id: 'session-1' }, data: { status: 'CANCELLED' } });
  });

  it('checks the occurrence start inside a serializable transaction before postponing', async () => {
    const startTime = new Date('2026-10-01T10:00:00.000Z');
    prisma.session.findUnique.mockResolvedValue(createdSession({ start_time: startTime }));

    await expect(rescheduleSessionOccurrence('session-1', {
      startTime: '2026-10-02T10:00:00.000Z',
      endTime: '2026-10-02T12:00:00.000Z',
      reason: 'Tutor requested a new time.',
    }, policy, { id: 'tutor-1', role: 'TUTOR' }, startTime)).rejects.toThrow('A Session can only be postponed before it starts.');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it('reads durable recovery details and recurring identity for one Tutor-owned Session', async () => {
    const currentTime = new Date('2026-10-01T14:00:00.000Z');
    prisma.session.findMany.mockResolvedValueOnce([{
      id: 'session-1', title: input.title, tutor_id: 'tutor-1', session_type: 'GROUP',
      series_id: 'series-1', occurrence_date: new Date('2026-10-01T00:00:00.000Z'),
      start_time: new Date('2026-10-01T14:00:00.000Z'), end_time: new Date('2026-10-01T16:00:00.000Z'),
      attendance_saved_at: null, attendance_submitted_at: null, attendance_finalized_at: null,
      attendance_notes: null, series_exception: false, series_exception_reason: null, token: null,
      status: 'SCHEDULED', historical_only: false,
      tutor: { id: 'tutor-1', name: 'Omar', tutor_hourly_rate_override: null },
      series: { weekday: 4, start_minute: 1020, duration_minutes: 120 },
      participants: [{ student: { id: 'student-1', name: 'Karim', email: 'karim@example.com' }, attendance_outcome: null }],
      attendances: [], tutor_compensation: null,
      _count: { attendances: 0, transactions: 0, commission_entries: 0 },
      attendance_recovery_grants: [{ id: 'grant-1', opened_at: new Date('2026-10-01T13:00:00.000Z'), closes_at: new Date('2026-10-01T15:00:00.000Z'), used_at: null, admin_reason: 'Tutor had an internet outage.', granted_by_admin: { name: 'Amina' } }],
    }]);

    const sessions = await getTutorSessions('tutor-1', { ...policy, defaultTutorHourlyRate: '0' }, currentTime, { mode: 'single', sessionId: 'session-1' });

    expect(prisma.session.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-1', tutor_id: 'tutor-1' } }));
    expect(sessions[0]).toMatchObject({
      attendanceNotes: null,
      seriesId: 'series-1', seriesSchedule: { weekday: 4, startMinute: 1020, durationMinutes: 120 },
      attendanceDisposition: 'HAS_ROSTER', recoveryGrant: {
        id: 'grant-1', openedAt: '2026-10-01T13:00:00.000Z', closesAt: '2026-10-01T15:00:00.000Z',
        adminName: 'Amina', adminReason: 'Tutor had an internet outage.', observedAt: currentTime.toISOString(),
      },
    });
  });

  it('bounds Agenda reads and distinguishes clean and history-bearing zero-roster Sessions', async () => {
    const currentTime = new Date('2026-10-01T14:00:00.000Z');
    prisma.session.findMany.mockResolvedValueOnce([
      {
        id: 'session-clean', title: 'Robotics Lab', tutor_id: 'tutor-1', session_type: 'GROUP', series_id: null, occurrence_date: null,
        start_time: new Date('2026-10-02T14:00:00.000Z'), end_time: new Date('2026-10-02T16:00:00.000Z'),
        attendance_saved_at: null, attendance_submitted_at: null, attendance_finalized_at: null, attendance_notes: null,
        series_exception: false, series_exception_reason: null, token: null, status: 'SCHEDULED', historical_only: false,
        tutor: { id: 'tutor-1', name: 'Omar', tutor_hourly_rate_override: null }, series: null, participants: [], attendances: [],
        tutor_compensation: null, _count: { attendances: 0, transactions: 0, commission_entries: 0 }, attendance_recovery_grants: [],
      },
      {
        id: 'session-legacy', title: 'Old Session', tutor_id: 'tutor-1', session_type: 'GROUP', series_id: null, occurrence_date: null,
        start_time: new Date('2026-09-28T14:00:00.000Z'), end_time: new Date('2026-09-28T16:00:00.000Z'),
        attendance_saved_at: null, attendance_submitted_at: null, attendance_finalized_at: null, attendance_notes: null,
        series_exception: false, series_exception_reason: null, token: null, status: 'SCHEDULED', historical_only: false,
        tutor: { id: 'tutor-1', name: 'Omar', tutor_hourly_rate_override: null }, series: null, participants: [], attendances: [{ student_id: 'student-1' }],
        tutor_compensation: null, _count: { attendances: 1, transactions: 0, commission_entries: 0 }, attendance_recovery_grants: [],
      },
    ]);

    const sessions = await getTutorSessions('tutor-1', { ...policy, defaultTutorHourlyRate: '0' }, currentTime, { mode: 'agenda', horizonDays: 7 });

    expect(prisma.session.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tutor_id: 'tutor-1', historical_only: false, status: { not: 'CANCELLED' },
        OR: expect.arrayContaining([
          expect.objectContaining({ start_time: expect.objectContaining({ gt: currentTime, lte: new Date('2026-10-08T14:00:00.000Z') }) }),
          expect.objectContaining({ participants: { some: {} }, attendance_submitted_at: null }),
        ]),
      }),
    }));
    expect(sessions.map(({ attendanceDisposition }) => attendanceDisposition)).toEqual(['NO_ACTION', 'ADMIN_REVIEW']);
  });
});
