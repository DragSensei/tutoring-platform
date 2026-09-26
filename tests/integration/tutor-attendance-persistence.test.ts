import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/features/auth/server/session';
import { saveTutorAttendanceDraft, submitTutorAttendance } from '@/app/(portal)/tutor/attendance/actions';
import { prisma } from '@/shared/lib/prisma';
import { accrueTutorCompensation } from '@/features/attendance/server/session-financials';
import { settleSubmittedAttendanceTx } from '@/features/attendance/server/finalize-due-attendance';

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), requireAuth: vi.fn(), accrue: vi.fn(), settle: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock('@/features/attendance/server/session-financials', () => ({ accrueTutorCompensation: mocks.accrue }));
vi.mock('@/features/attendance/server/finalize-due-attendance', () => ({ settleSubmittedAttendanceTx: mocks.settle }));

const START = new Date('2026-10-01T10:00:00.000Z');
const END = new Date('2026-10-01T12:00:00.000Z');
const CLOSE = new Date('2026-10-01T16:00:00.000Z');

function createTransaction(overrides: { session?: Record<string, unknown> | null; grant?: Record<string, unknown> | null } = {}) {
  const session = overrides.session === undefined ? {
    id: 'session-1', status: 'SCHEDULED', start_time: START, end_time: END, historical_only: false,
    attendance_saved_at: null, attendance_submitted_at: null, attendance_finalized_at: null, attendance_notes: null,
    participants: [
      { student_id: 'student-1', attendance_outcome: null },
      { student_id: 'student-2', attendance_outcome: null },
    ],
  } : overrides.session;
  const tx = {
    session: { findFirst: vi.fn().mockResolvedValue(session), update: vi.fn().mockResolvedValue({ id: 'session-1' }) },
    platformPolicy: { findUnique: vi.fn().mockResolvedValue({ check_in_window_hours: 4 }) },
    sessionParticipant: { update: vi.fn().mockResolvedValue({}) },
    attendanceRecord: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    attendanceRecoveryGrant: {
      findFirst: vi.fn().mockResolvedValue(overrides.grant ?? null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return tx;
}

function useTransaction(tx: ReturnType<typeof createTransaction>) {
  mocks.transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
}

const completeOutcomes = { 'student-1': 'PRESENT' as const, 'student-2': 'ABSENT' as const };

describe('Tutor attendance draft and final submission boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'tutor-1', email: 'tutor@example.com', name: 'Tutor', role: 'TUTOR' });
    vi.mocked(accrueTutorCompensation).mockResolvedValue(null);
    vi.mocked(settleSubmittedAttendanceTx).mockResolvedValue(true);
  });

  it('requires an authenticated Tutor before opening a transaction', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'));
    await expect(saveTutorAttendanceDraft({ sessionId: 'session-1', outcomes: {}, notes: '' }, START)).resolves.toEqual({ success: false, message: 'Tutor authentication is required.' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('saves a draft outcome without creating attendance records or financial effects', async () => {
    const tx = createTransaction();
    useTransaction(tx);
    const result = await saveTutorAttendanceDraft({ sessionId: 'session-1', outcomes: { 'student-1': 'PRESENT', 'student-2': null }, notes: 'Still teaching the lesson.' }, new Date(START.getTime() + 1));
    expect(result).toMatchObject({ success: true, presentCount: 1 });
    expect(tx.sessionParticipant.update).toHaveBeenCalledTimes(2);
    expect(tx.attendanceRecord.deleteMany).not.toHaveBeenCalled();
    expect(tx.attendanceRecord.createMany).not.toHaveBeenCalled();
    expect(accrueTutorCompensation).not.toHaveBeenCalled();
    expect(settleSubmittedAttendanceTx).not.toHaveBeenCalled();
  });

  it('rejects draft work before start and after the normal deadline', async () => {
    const beforeTx = createTransaction();
    useTransaction(beforeTx);
    await expect(saveTutorAttendanceDraft({ sessionId: 'session-1', outcomes: {}, notes: '' }, new Date(START.getTime() - 1))).resolves.toMatchObject({ success: false, message: 'Attendance drafts open when the Session starts.' });
    const afterTx = createTransaction();
    useTransaction(afterTx);
    await expect(saveTutorAttendanceDraft({ sessionId: 'session-1', outcomes: {}, notes: '' }, new Date(CLOSE.getTime() + 1))).resolves.toMatchObject({ success: false, message: 'The attendance window has closed. Ask Admin to grant a recovery window.' });
    expect(afterTx.sessionParticipant.update).not.toHaveBeenCalled();
  });

  it('does not allow final submission before Session end or with unresolved roster outcomes', async () => {
    const beforeTx = createTransaction();
    useTransaction(beforeTx);
    const input = { sessionId: 'session-1', outcomes: completeOutcomes, notes: 'The class completed its planned work.', normalEvidenceSelected: true };
    await expect(submitTutorAttendance(input, new Date(END.getTime() - 1))).resolves.toMatchObject({ success: false, message: 'Final attendance can be submitted after the Session ends.' });
    const partialTx = createTransaction();
    useTransaction(partialTx);
    await expect(submitTutorAttendance({ ...input, outcomes: { 'student-1': 'PRESENT' } }, END)).resolves.toMatchObject({ success: false, message: 'Choose Present or Absent for every Student before submitting.' });
    expect(partialTx.attendanceRecord.deleteMany).not.toHaveBeenCalled();
  });

  it('records final attendance and creates eligible Tutor compensation after Session end', async () => {
    const tx = createTransaction();
    useTransaction(tx);
    const result = await submitTutorAttendance({ sessionId: 'session-1', outcomes: completeOutcomes, notes: 'The class completed its planned work.', normalEvidenceSelected: true }, new Date(END.getTime() + 60_000));
    expect(result).toMatchObject({ success: true, presentCount: 1 });
    expect(tx.attendanceRecord.createMany).toHaveBeenCalledWith({ data: [{ session_id: 'session-1', student_id: 'student-1', attended_at: new Date(END.getTime() + 60_000) }], skipDuplicates: true });
    expect(tx.session.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ attendance_submitted_at: new Date(END.getTime() + 60_000) }) }));
    expect(accrueTutorCompensation).toHaveBeenCalledTimes(1);
    expect(settleSubmittedAttendanceTx).not.toHaveBeenCalled();
  });

  it('uses a live recovery grant with Tutor attestation and settles immediately after the normal deadline', async () => {
    const openedAt = new Date('2026-10-01T16:30:00.000Z');
    const closeAt = new Date('2026-10-01T17:30:00.000Z');
    const tx = createTransaction({ grant: { id: 'grant-1', opened_at: openedAt, closes_at: closeAt, used_at: null } });
    useTransaction(tx);
    const result = await submitTutorAttendance({
      sessionId: 'session-1', outcomes: completeOutcomes, notes: 'The class completed its planned work.', recoveryGrantId: 'grant-1',
      lateExplanation: 'Internet service stopped after the lesson.', tutorAttested: true, screenshotUnavailable: true,
    }, new Date('2026-10-01T17:00:00.000Z'));
    expect(result).toMatchObject({ success: true, presentCount: 1 });
    expect(tx.attendanceRecoveryGrant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ closes_at: { gte: new Date('2026-10-01T17:00:00.000Z') } }), data: expect.objectContaining({ tutor_attested_at: new Date('2026-10-01T17:00:00.000Z'), screenshot_unavailable: true }) }));
    expect(settleSubmittedAttendanceTx).toHaveBeenCalledTimes(1);
  });

  it('rejects a Session outside the authenticated Tutor scope', async () => {
    const tx = createTransaction({ session: null });
    useTransaction(tx);
    await expect(saveTutorAttendanceDraft({ sessionId: 'someone-elses-session', outcomes: {}, notes: '' }, START)).resolves.toEqual({ success: false, message: 'Session or roster is not available to this Tutor.' });
  });
});
