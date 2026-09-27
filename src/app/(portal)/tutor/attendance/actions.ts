'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/features/auth/server/session';
import {
  tutorAttendanceDraftSchema,
  tutorAttendanceSubmissionSchema,
  type TutorAttendanceDraftInput,
  type TutorAttendanceSubmissionInput,
} from '@/features/attendance/schemas';
import { MIN_SESSION_NOTE_LENGTH } from '@/features/attendance/utils/attendance-review';
import { settleSubmittedAttendanceTx } from '@/features/attendance/server/finalize-due-attendance';
import { accrueTutorCompensation } from '@/features/attendance/server/session-financials';
import { prisma } from '@/shared/lib/prisma';
import { CHECKIN_WINDOW_HOURS, computeAttendanceClosesAt } from '@/shared/utils/deadline';

export type TutorAttendanceResult =
  | { success: true; sessionId: string; presentCount: number; alreadySubmitted?: boolean }
  | { success: false; message: string };

export async function saveTutorAttendanceDraft(
  input: TutorAttendanceDraftInput,
  currentTime = new Date(),
): Promise<TutorAttendanceResult> {
  let tutorId: string;
  try {
    tutorId = (await requireAuth(['TUTOR'])).userId;
  } catch {
    return { success: false, message: 'Tutor authentication is required.' };
  }

  const parsed = tutorAttendanceDraftSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.errors[0]?.message || 'Invalid attendance draft.' };

  try {
    const result = await withSerializableRetry((tx) => saveDraftTx(tx, tutorId, parsed.data, currentTime));
    revalidateAttendanceRoutes(result.sessionId);
    return result;
  } catch (error) {
    return attendanceFailure(error, 'Attendance draft could not be saved. Please try again.');
  }
}

export async function submitTutorAttendance(
  input: TutorAttendanceSubmissionInput,
  currentTime = new Date(),
): Promise<TutorAttendanceResult> {
  let tutorId: string;
  try {
    tutorId = (await requireAuth(['TUTOR'])).userId;
  } catch {
    return { success: false, message: 'Tutor authentication is required.' };
  }

  const parsed = tutorAttendanceSubmissionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.errors[0]?.message || 'Invalid attendance submission.' };

  try {
    const result = await withSerializableRetry((tx) => submitAttendanceTx(tx, tutorId, parsed.data, currentTime));
    revalidateAttendanceRoutes(result.sessionId);
    revalidatePath('/admin');
    revalidatePath('/admin/needs-attention');
    revalidatePath('/admin/gadwal');
    revalidatePath('/admin/finances/tutors');
    revalidatePath(`/admin/finances/sessions/${result.sessionId}`);
    return result;
  } catch (error) {
    return attendanceFailure(error, 'Attendance could not be submitted. Please try again.');
  }
}

async function saveDraftTx(
  tx: Prisma.TransactionClient,
  tutorId: string,
  input: TutorAttendanceDraftInput,
  currentTime: Date,
): Promise<Exclude<TutorAttendanceResult, { success: false }>> {
  const session = await getTutorAttendanceSession(tx, tutorId, input.sessionId);
  assertEditableSession(session);
  const policy = await tx.platformPolicy.findUnique({ where: { id: 'default' }, select: { check_in_window_hours: true } });
  const close = computeAttendanceClosesAt(session.end_time, policy?.check_in_window_hours ?? CHECKIN_WINDOW_HOURS);
  const activeRecovery = await getActiveRecoveryGrant(tx, session.id, currentTime);
  if (currentTime < session.start_time || (currentTime > close && !activeRecovery)) {
    throw new AttendanceStateError(currentTime < session.start_time
      ? 'Attendance drafts open when the Session starts.'
      : 'The attendance window has closed. Ask Admin to grant a recovery window.');
  }

  const rosterIds = new Set(session.participants.map(({ student_id }) => student_id));
  if (Object.keys(input.outcomes).some((studentId) => !rosterIds.has(studentId))) throw new AttendanceAccessError();
  for (const [studentId, outcome] of Object.entries(input.outcomes)) {
    await tx.sessionParticipant.update({
      where: { session_id_student_id: { session_id: session.id, student_id: studentId } },
      data: { attendance_outcome: outcome },
    });
  }
  await tx.session.update({
    where: { id: session.id },
    data: { attendance_notes: input.notes, attendance_saved_at: currentTime },
  });
  return { success: true, sessionId: session.id, presentCount: Object.values(input.outcomes).filter((outcome) => outcome === 'PRESENT').length };
}

async function submitAttendanceTx(
  tx: Prisma.TransactionClient,
  tutorId: string,
  input: TutorAttendanceSubmissionInput,
  currentTime: Date,
): Promise<Exclude<TutorAttendanceResult, { success: false }>> {
  const session = await getTutorAttendanceSession(tx, tutorId, input.sessionId);
  if (session.historical_only) throw new AttendanceStateError('Historical schedule records cannot record attendance.');
  if (session.status === 'CANCELLED') throw new AttendanceStateError('Cancelled sessions cannot record attendance.');
  if (input.notes.trim().length < MIN_SESSION_NOTE_LENGTH) {
    throw new AttendanceStateError(`Session notes must be at least ${MIN_SESSION_NOTE_LENGTH} characters.`);
  }
  const rosterIds = session.participants.map(({ student_id }) => student_id);
  if (!rosterIds.length) throw new AttendanceStateError('Attendance cannot be submitted without an assigned Student roster.');
  const submittedIds = Object.keys(input.outcomes).sort();
  if (submittedIds.length !== rosterIds.length || submittedIds.some((id) => !rosterIds.includes(id)) || Object.values(input.outcomes).some((outcome) => !outcome)) {
    throw new AttendanceStateError('Choose Present or Absent for every Student before submitting.');
  }

  const policy = await tx.platformPolicy.findUnique({
    where: { id: 'default' },
    select: { check_in_window_hours: true },
  });
  const close = computeAttendanceClosesAt(session.end_time, policy?.check_in_window_hours ?? CHECKIN_WINDOW_HOURS);
  const grant = input.recoveryGrantId
    ? await tx.attendanceRecoveryGrant.findFirst({ where: { id: input.recoveryGrantId, session_id: session.id } })
    : null;

  if (session.attendance_submitted_at) {
    const sameOutcomes = session.participants.every(({ student_id, attendance_outcome }) => input.outcomes[student_id] === attendance_outcome);
    const usedGrant = await tx.attendanceRecoveryGrant.findFirst({ where: { session_id: session.id, used_at: { not: null } } });
    const sameRecovery = input.recoveryGrantId
      ? usedGrant?.id === input.recoveryGrantId
        && usedGrant.tutor_explanation === input.lateExplanation?.trim()
        && usedGrant.screenshot_unavailable === input.screenshotUnavailable
      : !usedGrant;
    if (!sameOutcomes || session.attendance_notes !== input.notes.trim() || !sameRecovery) {
      throw new AttendanceStateError('Attendance has already been submitted and cannot be changed.');
    }
    await accrueTutorCompensation(tx, session.id, currentTime);
    await settleSubmittedAttendanceTx(tx, session.id, currentTime, policy?.check_in_window_hours ?? CHECKIN_WINDOW_HOURS);
    return { success: true, sessionId: session.id, presentCount: submittedIds.filter((id) => input.outcomes[id] === 'PRESENT').length, alreadySubmitted: true };
  }

  if (currentTime < session.end_time) throw new AttendanceStateError('Final attendance can be submitted after the Session ends.');
  if (input.recoveryGrantId) {
    if (!grant || grant.used_at || currentTime < grant.opened_at || currentTime > grant.closes_at) {
      throw new AttendanceStateError('The Admin recovery window is not active. Ask Admin to review this Session.');
    }
    if ((input.lateExplanation?.trim().length ?? 0) < MIN_SESSION_NOTE_LENGTH) {
      throw new AttendanceStateError('Explain why attendance is late before submitting.');
    }
    if (input.tutorAttested !== true || typeof input.screenshotUnavailable !== 'boolean') {
      throw new AttendanceStateError('Confirm that this attendance is accurate and report screenshot availability.');
    }
  } else {
    if (currentTime > close) throw new AttendanceStateError('The attendance deadline passed. Ask Admin to grant a recovery window.');
    if (input.normalEvidenceSelected !== true) throw new AttendanceStateError('Attach the normal session screenshot before submitting attendance.');
  }

  for (const [studentId, outcome] of Object.entries(input.outcomes)) {
    await tx.sessionParticipant.update({
      where: { session_id_student_id: { session_id: session.id, student_id: studentId } },
      data: { attendance_outcome: outcome },
    });
  }
  const presentStudentIds = submittedIds.filter((studentId) => input.outcomes[studentId] === 'PRESENT');
  await tx.attendanceRecord.deleteMany({ where: { session_id: session.id, student_id: { notIn: presentStudentIds } } });
  if (presentStudentIds.length) {
    await tx.attendanceRecord.createMany({
      data: presentStudentIds.map((student_id) => ({ session_id: session.id, student_id, attended_at: currentTime })),
      skipDuplicates: true,
    });
  }
  await tx.session.update({
    where: { id: session.id },
    data: { attendance_notes: input.notes.trim(), attendance_saved_at: currentTime, attendance_submitted_at: currentTime },
  });

  if (grant && input.recoveryGrantId) {
    const used = await tx.attendanceRecoveryGrant.updateMany({
      where: { id: grant.id, session_id: session.id, used_at: null, opened_at: { lte: currentTime }, closes_at: { gte: currentTime } },
      data: {
        tutor_explanation: input.lateExplanation!.trim(),
        tutor_attested_at: currentTime,
        screenshot_unavailable: input.screenshotUnavailable!,
        used_at: currentTime,
      },
    });
    if (used.count !== 1) throw new AttendanceStateError('The Admin recovery window is no longer active.');
  }

  await accrueTutorCompensation(tx, session.id, currentTime);
  if (currentTime >= close) {
    await settleSubmittedAttendanceTx(tx, session.id, currentTime, policy?.check_in_window_hours ?? CHECKIN_WINDOW_HOURS);
  }
  return { success: true, sessionId: session.id, presentCount: presentStudentIds.length };
}

async function getTutorAttendanceSession(tx: Prisma.TransactionClient, tutorId: string, sessionId: string) {
  const session = await tx.session.findFirst({
    where: { id: sessionId, tutor_id: tutorId },
    select: {
      id: true,
      status: true,
      start_time: true,
      end_time: true,
      historical_only: true,
      attendance_saved_at: true,
      attendance_submitted_at: true,
      attendance_finalized_at: true,
      attendance_notes: true,
      participants: { select: { student_id: true, attendance_outcome: true } },
    },
  });
  if (!session) throw new AttendanceAccessError();
  return session;
}

function assertEditableSession(session: Awaited<ReturnType<typeof getTutorAttendanceSession>>) {
  if (session.historical_only) throw new AttendanceStateError('Historical schedule records cannot record attendance.');
  if (session.status === 'CANCELLED') throw new AttendanceStateError('Cancelled sessions cannot record attendance.');
  if (session.attendance_submitted_at || session.attendance_finalized_at) {
    throw new AttendanceStateError('Submitted attendance cannot be edited.');
  }
}

async function getActiveRecoveryGrant(tx: Prisma.TransactionClient, sessionId: string, now: Date) {
  return tx.attendanceRecoveryGrant.findFirst({
    where: { session_id: sessionId, used_at: null, opened_at: { lte: now }, closes_at: { gte: now } },
    select: { id: true },
  });
}

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
  throw new Error('Attendance transaction could not be completed');
}

function revalidateAttendanceRoutes(sessionId: string) {
  revalidatePath('/tutor/agenda');
  revalidatePath('/tutor/history');
  revalidatePath('/tutor/timetable');
  revalidatePath(`/tutor/attendance/${sessionId}`);
  revalidatePath('/student/dashboard');
}

function attendanceFailure(error: unknown, fallback: string): TutorAttendanceResult {
  if (error instanceof AttendanceAccessError) return { success: false, message: 'Session or roster is not available to this Tutor.' };
  if (error instanceof AttendanceStateError) return { success: false, message: error.message };
  console.error('[TUTOR_ATTENDANCE] Failed to process attendance:', error);
  return { success: false, message: fallback };
}

class AttendanceAccessError extends Error {}
class AttendanceStateError extends Error {}
