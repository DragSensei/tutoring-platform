import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/features/auth/server/session';
import { saveTutorAttendance } from '@/app/(portal)/tutor/attendance/actions';
import { prisma } from '@/shared/lib/prisma';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: vi.fn() }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: { $transaction: vi.fn() } }));

const START = new Date('2026-10-01T10:00:00.000Z');
const END = new Date('2026-10-01T12:00:00.000Z');
const CLOSE = new Date('2026-10-01T16:00:00.000Z');

function createTransaction(session: object | null = {
  id: 'session-1',
  status: 'SCHEDULED',
  start_time: START,
  end_time: END,
  attendance_finalized_at: null,
}) {
  return {
    session: {
      findFirst: vi.fn().mockResolvedValue(session),
      update: vi.fn().mockResolvedValue({ id: 'session-1' }),
    },
    platformPolicy: { findUnique: vi.fn().mockResolvedValue({ check_in_window_hours: 4 }) },
    sessionParticipant: {
      findMany: vi.fn().mockResolvedValue([{ student_id: 'student-1' }, { student_id: 'student-2' }]),
    },
    attendanceRecord: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('Tutor attendance persistence boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'tutor-1', email: 'tutor@example.com', name: 'Tutor', role: 'TUTOR',
    });
  });

  it('requires a server-authenticated Tutor before opening a transaction', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));
    const result = await saveTutorAttendance({ sessionId: 'session-1', presentStudentIds: [], notes: 'Everyone was absent today.' }, START);
    expect(result).toEqual({ success: false, message: 'Tutor authentication is required.' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects before the concrete start and after the grace close', async () => {
    const beforeTx = createTransaction();
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => callback(beforeTx));
    const before = await saveTutorAttendance({ sessionId: 'session-1', presentStudentIds: [], notes: 'Before the session starts.' }, new Date(START.getTime() - 1));
    expect(before).toEqual({ success: false, message: 'Attendance opens when the session starts.' });
    expect(beforeTx.attendanceRecord.deleteMany).not.toHaveBeenCalled();

    const afterTx = createTransaction();
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => callback(afterTx));
    const after = await saveTutorAttendance({ sessionId: 'session-1', presentStudentIds: [], notes: 'After the attendance grace.' }, new Date(CLOSE.getTime() + 1));
    expect(after).toEqual({ success: false, message: 'The attendance window has closed.' });
    expect(afterTx.attendanceRecord.deleteMany).not.toHaveBeenCalled();
  });

  it('saves attendance during the session without wallet work or completion', async () => {
    const tx = createTransaction();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const result = await saveTutorAttendance({ sessionId: 'session-1', presentStudentIds: ['student-1'], notes: 'The first student attended today.' }, START);
    expect(result).toEqual({ success: true, sessionId: 'session-1', presentCount: 1 });
    expect(tx.attendanceRecord.createMany).toHaveBeenCalledWith({
      data: [{ session_id: 'session-1', student_id: 'student-1' }],
      skipDuplicates: true,
    });
    expect(tx.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { attendance_notes: 'The first student attended today.', attendance_saved_at: START },
    });
  });

  it('rejects a session not owned by the authenticated Tutor', async () => {
    const tx = createTransaction(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const result = await saveTutorAttendance({ sessionId: 'someone-elses-session', presentStudentIds: [], notes: 'This Tutor is not assigned.' }, START);
    expect(result).toEqual({ success: false, message: 'Session or roster is not available to this Tutor.' });
  });
});
