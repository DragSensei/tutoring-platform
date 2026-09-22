import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';
import type { SessionType } from '@/shared/types';
import { reconcileSessionFinancialState } from './session-financials';

export interface AttendanceFinalizerPolicy {
  checkInWindowHours: number;
}

export interface FinalizeDueAttendanceResult {
  dueCount: number;
  finalizedCount: number;
}

async function finalizeOneDueAttendance(sessionId: string, currentTime: Date, policy: AttendanceFinalizerPolicy) {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        end_time: true,
        session_type: true,
        status: true,
        attendance_saved_at: true,
        attendance_finalized_at: true,
        participants: { select: { student_id: true } },
        attendances: { select: { student_id: true } },
      },
    });

    if (
      !candidate ||
      candidate.status === 'CANCELLED' ||
      candidate.status === 'COMPLETED' ||
      !candidate.attendance_saved_at ||
      candidate.attendance_finalized_at ||
      currentTime.getTime() < computeAttendanceClosesAt(candidate.end_time, policy.checkInWindowHours).getTime()
    ) {
      return false;
    }

    // The conditional claim is the idempotency/concurrency gate. If another
    // finalizer wins it, this transaction performs no wallet work.
    const claim = await tx.session.updateMany({
      where: {
        id: sessionId,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        attendance_saved_at: { not: null },
        attendance_finalized_at: null,
      },
      data: { attendance_finalized_at: currentTime },
    });
    if (claim.count !== 1) return false;

    const presentStudentIds = new Set(candidate.attendances.map((attendance) => attendance.student_id));
    for (const participant of candidate.participants) {
      await reconcileSessionFinancialState(tx, {
        sessionId: candidate.id,
        studentId: participant.student_id,
        sessionType: candidate.session_type as SessionType,
        present: presentStudentIds.has(participant.student_id),
        occurredAt: currentTime,
      });
    }

    await tx.session.update({
      where: { id: candidate.id },
      data: { status: 'COMPLETED' },
    });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function finalizeDueAttendance(
  policy: AttendanceFinalizerPolicy,
  currentTime = new Date(),
): Promise<FinalizeDueAttendanceResult> {
  const candidates = await prisma.session.findMany({
    where: {
      status: { in: ['SCHEDULED', 'ACTIVE'] },
      attendance_saved_at: { not: null },
      attendance_finalized_at: null,
    },
    select: { id: true, end_time: true },
    orderBy: { end_time: 'asc' },
  });
  const due = candidates.filter((session) =>
    currentTime.getTime() >= computeAttendanceClosesAt(session.end_time, policy.checkInWindowHours).getTime()
  );

  let finalizedCount = 0;
  for (const session of due) {
    try {
      if (await finalizeOneDueAttendance(session.id, currentTime, policy)) finalizedCount += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        continue;
      }
      throw error;
    }
  }

  return { dueCount: due.length, finalizedCount };
}
