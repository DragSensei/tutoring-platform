import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/features/auth/server/session';
import { saveTutorAttendance } from '@/app/(portal)/tutor/attendance/actions';
import { prisma } from '@/shared/lib/prisma';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: vi.fn() }));
vi.mock('@/shared/lib/prisma', () => ({
  prisma: { $transaction: vi.fn() },
}));

function createTransaction(overrides?: {
  session?: { id: string; session_type: 'PRIVATE' | 'GROUP'; status: string } | null;
  roster?: { id: string }[];
}) {
  return {
    session: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.session === undefined
          ? { id: 'session-1', session_type: 'GROUP', status: 'ACTIVE' }
          : overrides.session
      ),
      update: vi.fn().mockResolvedValue({ id: 'session-1' }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.roster || [{ id: 'student-1' }, { id: 'student-2' }]
      ),
    },
    attendanceRecord: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('Tutor attendance persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'tutor-1',
      email: 'tutor@example.com',
      name: 'Tutor',
      role: 'TUTOR',
    });
  });

  it('requires a server-authenticated Tutor before opening a transaction', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));

    const result = await saveTutorAttendance({
      sessionId: 'session-1',
      presentStudentIds: [],
      notes: 'Everyone was absent today.',
    });

    expect(result).toEqual({
      success: false,
      message: 'Tutor authentication is required.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a session not owned by the authenticated Tutor', async () => {
    const tx = createTransaction({ session: null });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

    const result = await saveTutorAttendance({
      sessionId: 'someone-elses-session',
      presentStudentIds: [],
      notes: 'Everyone was absent today.',
    });

    expect(tx.session.findFirst).toHaveBeenCalledWith({
      where: { id: 'someone-elses-session', tutor_id: 'tutor-1' },
      select: { id: true, session_type: true, status: true },
    });
    expect(result.success).toBe(false);
    expect(tx.attendanceRecord.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects submitted students outside the server roster', async () => {
    const tx = createTransaction({ roster: [{ id: 'student-1' }] });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

    const result = await saveTutorAttendance({
      sessionId: 'session-1',
      presentStudentIds: ['student-2'],
      notes: 'Reviewed the complete roster.',
    });

    expect(result.success).toBe(false);
    expect(tx.attendanceRecord.deleteMany).not.toHaveBeenCalled();
    expect(tx.session.update).not.toHaveBeenCalled();
  });

  it('persists a reviewed all-absent session atomically', async () => {
    const tx = createTransaction();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

    const result = await saveTutorAttendance({
      sessionId: 'session-1',
      presentStudentIds: [],
      notes: 'Everyone was absent today.',
    });

    expect(result).toEqual({ success: true, sessionId: 'session-1', presentCount: 0 });
    expect(tx.attendanceRecord.deleteMany).toHaveBeenCalledWith({
      where: { session_id: 'session-1' },
    });
    expect(tx.attendanceRecord.createMany).not.toHaveBeenCalled();
    expect(tx.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        attendance_notes: 'Everyone was absent today.',
        status: 'COMPLETED',
      },
    });
  });

  it('makes repeated saves idempotent through delete-and-create with unique-key skipping', async () => {
    const tx = createTransaction();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const input = {
      sessionId: 'session-1',
      presentStudentIds: ['student-1', 'student-1'],
      notes: 'Student one completed the lesson.',
    };

    const first = await saveTutorAttendance(input);
    const second = await saveTutorAttendance(input);

    expect(first).toEqual({ success: true, sessionId: 'session-1', presentCount: 1 });
    expect(second).toEqual(first);
    expect(tx.attendanceRecord.createMany).toHaveBeenCalledTimes(2);
    expect(tx.attendanceRecord.createMany).toHaveBeenLastCalledWith({
      data: [{ session_id: 'session-1', student_id: 'student-1' }],
      skipDuplicates: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/student/dashboard');
  });
});
