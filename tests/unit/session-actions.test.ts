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
  session: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock('@/features/auth/server/session', () => ({ requireAuth }));
vi.mock('@/features/policies/server/policy-actions', () => ({ getPlatformPolicies: vi.fn(async () => policy) }));
vi.mock('@/shared/lib/prisma', () => ({ prisma }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { createSession, updateSession, deleteSession } = await import('@/features/sessions/server/session-actions');
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
});
