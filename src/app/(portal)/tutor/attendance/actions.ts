'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/features/auth/server/session';
import {
  tutorAttendanceSchema,
  type TutorAttendanceInput,
} from '@/features/attendance/schemas';
import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';
import { CHECKIN_WINDOW_HOURS, computeAttendanceClosesAt, isAttendanceWindowOpen } from '@/shared/utils/deadline';

export type SaveTutorAttendanceResult =
  | { success: true; sessionId: string; presentCount: number }
  | { success: false; message: string };

export async function saveTutorAttendance(
  input: TutorAttendanceInput,
  currentTime = new Date(),
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
      (tx) => persistTutorAttendance(tx, { tutorId, sessionId, presentStudentIds, notes, currentTime }),
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
  input: TutorAttendanceInput & { tutorId: string; currentTime: Date }
) {
  const session = await tx.session.findFirst({
    where: { id: input.sessionId, tutor_id: input.tutorId },
    select: { id: true, status: true, start_time: true, end_time: true, attendance_finalized_at: true },
  });

  if (!session) throw new AttendanceAccessError();
  if (session.status === 'CANCELLED') {
    throw new AttendanceStateError('Cancelled sessions cannot record attendance.');
  }
  if (session.status === 'COMPLETED' || session.attendance_finalized_at) {
    throw new AttendanceStateError('Attendance for this session is already finalized.');
  }

  const policy = await tx.platformPolicy.findUnique({
    where: { id: 'default' },
    select: { check_in_window_hours: true },
  });
  const attendanceClosesAt = computeAttendanceClosesAt(
    session.end_time,
    policy?.check_in_window_hours ?? CHECKIN_WINDOW_HOURS,
  );
  if (!isAttendanceWindowOpen(session.start_time, attendanceClosesAt, input.currentTime)) {
    throw new AttendanceStateError(
      input.currentTime < session.start_time
        ? 'Attendance opens when the session starts.'
        : 'The attendance window has closed.'
    );
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

  await tx.session.update({
    where: { id: session.id },
    data: {
      attendance_notes: input.notes,
      attendance_saved_at: input.currentTime,
    },
  });
}

class AttendanceAccessError extends Error {}
class AttendanceStateError extends Error {}
