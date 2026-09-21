'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/features/auth/server/session';
import {
  tutorAttendanceSchema,
  type TutorAttendanceInput,
} from '@/features/attendance/schemas';
import { reconcileSessionFinancialState } from '@/features/attendance/server/session-financials';
import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';

export type SaveTutorAttendanceResult =
  | { success: true; sessionId: string; presentCount: number }
  | { success: false; message: string };

export async function saveTutorAttendance(
  input: TutorAttendanceInput
): Promise<SaveTutorAttendanceResult> {
  let tutorId: string;
  try {
    tutorId = (await requireAuth(['TUTOR'])).userId;
  } catch {
    return { success: false, message: 'Tutor authentication is required.' };
  }

  const parsed = tutorAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message || 'Invalid attendance data.',
    };
  }

  const { sessionId, notes } = parsed.data;
  const presentStudentIds = [...new Set(parsed.data.presentStudentIds)];

  try {
    await prisma.$transaction(
      (tx) => persistTutorAttendance(tx, { tutorId, sessionId, presentStudentIds, notes }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof AttendanceAccessError) {
      return { success: false, message: 'Session or roster is not available to this Tutor.' };
    }
    if (error instanceof AttendanceStateError) {
      return { success: false, message: error.message };
    }
    console.error('[TUTOR_ATTENDANCE] Failed to save attendance:', error);
    return { success: false, message: 'Attendance could not be saved. Please try again.' };
  }

  revalidatePath('/tutor/agenda');
  revalidatePath('/tutor/history');
  revalidatePath(`/tutor/attendance/${sessionId}`);
  revalidatePath('/student/dashboard');

  return { success: true, sessionId, presentCount: presentStudentIds.length };
}

async function persistTutorAttendance(
  tx: Prisma.TransactionClient,
  input: TutorAttendanceInput & { tutorId: string }
) {
  const session = await tx.session.findFirst({
    where: { id: input.sessionId, tutor_id: input.tutorId },
    select: { id: true, session_type: true, status: true },
  });

  if (!session) throw new AttendanceAccessError();
  if (session.status === 'CANCELLED') {
    throw new AttendanceStateError('Cancelled sessions cannot record attendance.');
  }

  const participants = await tx.sessionParticipant.findMany({
    where: { session_id: session.id },
    select: { student_id: true },
  });
  if (participants.length === 0) {
    throw new AttendanceAccessError();
  }

  const rosterIds = new Set(participants.map((participant) => participant.student_id));
  if (input.presentStudentIds.some((studentId) => !rosterIds.has(studentId))) {
    throw new AttendanceAccessError();
  }

  await tx.attendanceRecord.deleteMany({
    where:
      input.presentStudentIds.length === 0
        ? { session_id: session.id }
        : {
            session_id: session.id,
            student_id: { notIn: input.presentStudentIds },
          },
  });

  if (input.presentStudentIds.length > 0) {
    await tx.attendanceRecord.createMany({
      data: input.presentStudentIds.map((studentId) => ({
        session_id: session.id,
        student_id: studentId,
      })),
      skipDuplicates: true,
    });
  }

  const presentIds = new Set(input.presentStudentIds);
  for (const participant of participants) {
    await reconcileSessionFinancialState(tx, {
      sessionId: session.id,
      studentId: participant.student_id,
      sessionType: session.session_type,
      present: presentIds.has(participant.student_id),
      occurredAt: new Date(),
    });
  }

  await tx.session.update({
    where: { id: session.id },
    data: {
      attendance_notes: input.notes,
      status: 'COMPLETED',
    },
  });
}

class AttendanceAccessError extends Error {}
class AttendanceStateError extends Error {}
