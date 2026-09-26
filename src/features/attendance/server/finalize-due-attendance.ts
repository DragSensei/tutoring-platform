import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';
import type { SessionType } from '@/shared/types';
import { accrueTutorCompensation, reconcileSessionFinancialState } from './session-financials';

export interface AttendanceFinalizerPolicy {
  checkInWindowHours: number;
}

export interface FinalizeDueAttendanceResult {
  dueCount: number;
  finalizedCount: number;
}

export async function settleSubmittedAttendanceTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  currentTime: Date,
  checkInWindowHours: number,
): Promise<boolean> {
  const session = await tx.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      end_time: true,
      session_type: true,
      status: true,
      historical_only: true,
      attendance_submitted_at: true,
      attendance_finalized_at: true,
      participants: { select: { student_id: true, attendance_outcome: true } },
    },
  });

  if (!session || session.historical_only || session.status === 'CANCELLED' || !session.attendance_submitted_at) return false;
  if (session.attendance_finalized_at) return false;
  if (currentTime < computeAttendanceClosesAt(session.end_time, checkInWindowHours)) return false;
  if (!session.participants.length || session.participants.some(({ attendance_outcome }) => !attendance_outcome)) {
    throw new Error('Financial settlement requires a complete submitted roster');
  }

  const claim = await tx.session.updateMany({
    where: {
      id: sessionId,
      historical_only: false,
      status: { in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] },
      attendance_submitted_at: { not: null },
      attendance_finalized_at: null,
    },
    data: { attendance_finalized_at: currentTime },
  });
  if (claim.count !== 1) return false;

  for (const participant of session.participants) {
    await reconcileSessionFinancialState(tx, {
      sessionId,
      studentId: participant.student_id,
      sessionType: session.session_type as SessionType,
      present: participant.attendance_outcome === 'PRESENT',
      occurredAt: currentTime,
    });
  }

  await accrueTutorCompensation(tx, sessionId, currentTime);
  await tx.session.update({ where: { id: sessionId }, data: { status: 'COMPLETED' } });
  return true;
}

async function finalizeOneDueAttendance(sessionId: string, currentTime: Date, policy: AttendanceFinalizerPolicy) {
  return prisma.$transaction(
    (tx) => settleSubmittedAttendanceTx(tx, sessionId, currentTime, policy.checkInWindowHours),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function finalizeDueAttendance(
  policy: AttendanceFinalizerPolicy,
  currentTime = new Date(),
): Promise<FinalizeDueAttendanceResult> {
  const candidates = await prisma.session.findMany({
    where: {
      status: { in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] },
      historical_only: false,
      attendance_submitted_at: { not: null },
      attendance_finalized_at: null,
    },
    select: { id: true, end_time: true },
    orderBy: { end_time: 'asc' },
  });
  const due = candidates.filter((session) =>
    currentTime >= computeAttendanceClosesAt(session.end_time, policy.checkInWindowHours)
  );

  let finalizedCount = 0;
  for (const session of due) {
    try {
      if (await finalizeOneDueAttendance(session.id, currentTime, policy)) finalizedCount += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') continue;
      throw error;
    }
  }

  return { dueCount: due.length, finalizedCount };
}
