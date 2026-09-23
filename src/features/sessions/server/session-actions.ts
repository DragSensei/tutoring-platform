import { prisma } from '@/shared/lib/prisma';
import { computeAttendanceClosesAt, getAttendanceWindowState } from '@/shared/utils/deadline';
import type { SessionType, TutorVolumeKPIs } from '@/shared/types';
import { formatSessionCode } from '@/shared/utils/session-code';
import { createSessionSchema, type CreateSessionInput, type SessionFilterInput } from '../schemas';
import { academyDateTime, materializeActiveSeriesForTutor } from './recurrence';
import type { Prisma } from '@prisma/client';

export interface SessionPricingConfig {
  checkInWindowHours: number;
  groupSessionPrice: number;
  privateSessionPrice: number;
}

const SESSION_INCLUDE = {
  tutor: { select: { id: true, name: true, email: true } },
  series: { select: { start_minute: true } },
  participants: {
    include: { student: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { attendances: true, transactions: true } },
} as const;

type SessionWithDetails = Prisma.SessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

function sessionPrice(sessionType: SessionType, policy: SessionPricingConfig): number {
  return sessionType === 'PRIVATE' ? policy.privateSessionPrice : policy.groupSessionPrice;
}

function displayProfile(value: string | null): string {
  return value ?? 'Not provided';
}

function parseSessionInput(input: CreateSessionInput): CreateSessionInput {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid session details');
  }

  const start = new Date(parsed.data.startTime);
  const end = new Date(parsed.data.endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error('End time must be strictly after start time');
  }

  return {
    ...parsed.data,
    participantIds: [...new Set(parsed.data.participantIds)],
  };
}

async function validateSessionReferences(input: CreateSessionInput) {
  const tutor = await prisma.user.findUnique({
    where: { id: input.tutorId },
    select: { id: true, role: true },
  });
  if (!tutor || tutor.role !== 'TUTOR') {
    throw new Error('A valid Tutor account is required');
  }

  const students = await prisma.user.findMany({
    where: { id: { in: input.participantIds }, role: 'STUDENT' },
    select: { id: true },
  });
  if (students.length !== input.participantIds.length) {
    throw new Error('Every assigned participant must be a Student account');
  }
}

function serializeSession(
  session: SessionWithDetails,
  policy: SessionPricingConfig
) {
  const attendanceClosesAt = computeAttendanceClosesAt(session.end_time, policy.checkInWindowHours);
  const baseStartTime = session.series && session.occurrence_date
    ? academyDateTime(session.occurrence_date, session.series.start_minute)
    : session.start_time;
  return {
    id: session.id,
    title: session.title,
    tutorId: session.tutor_id,
    tutorName: displayProfile(session.tutor.name),
    sessionType: session.session_type as SessionType,
    startTime: session.start_time.toISOString(),
    endTime: session.end_time.toISOString(),
    deadline: attendanceClosesAt.toISOString(),
    attendanceClosesAt: attendanceClosesAt.toISOString(),
    attendanceSavedAt: session.attendance_saved_at?.toISOString() || null,
    attendanceFinalizedAt: session.attendance_finalized_at?.toISOString() || null,
    baseStartTime: baseStartTime.toISOString(),
    isRescheduled: session.series_exception,
    rescheduleReason: session.series_exception_reason,
    token: session.token,
    status: session.status,
    historicalOnly: session.historical_only,
    attendeeCount: session._count.attendances,
    participantCount: session.participants.length,
    transactionCount: session._count.transactions,
    attendanceNotes: session.attendance_notes,
    assignedStudents: session.participants.map(({ student }) => displayProfile(student.name)),
    roster: session.participants.map(({ student }) => ({ id: student.id, name: displayProfile(student.name), email: displayProfile(student.email), attended: false })),
    price: sessionPrice(session.session_type as SessionType, policy),
  };
}

export async function createSession(input: CreateSessionInput, policy: SessionPricingConfig) {
  const validInput = parseSessionInput(input);
  const start = new Date(validInput.startTime);
  const end = new Date(validInput.endTime);
  await validateSessionReferences(validInput);
  const deadline = computeAttendanceClosesAt(end, policy.checkInWindowHours);

  const session = await prisma.$transaction(async (tx) => {
    return tx.session.create({
      data: {
        title: validInput.title,
        tutor_id: validInput.tutorId,
        session_type: validInput.sessionType,
        start_time: start,
        end_time: end,
        deadline,
        status: 'SCHEDULED',
        participants: {
          create: validInput.participantIds.map((student_id) => ({ student_id })),
        },
      },
      include: SESSION_INCLUDE,
    });
  });

  return serializeSession(session, policy);
}

export async function getGadwalSessions(filter: SessionFilterInput | undefined, policy: SessionPricingConfig) {
  const whereClause: {
    tutor_id?: string;
    historical_only?: boolean;
    status?: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    start_time?: { gte?: Date; lte?: Date };
  } = {};

  whereClause.historical_only = false;
  if (filter?.tutorId) whereClause.tutor_id = filter.tutorId;
  if (filter?.status) whereClause.status = filter.status;
  if (filter?.startDate || filter?.endDate) {
    whereClause.start_time = {};
    if (filter?.startDate) whereClause.start_time.gte = new Date(filter.startDate);
    if (filter?.endDate) whereClause.start_time.lte = new Date(filter.endDate);
  }

  const sessions = await prisma.session.findMany({
    where: whereClause,
    include: {
      tutor: { select: { id: true, name: true } },
      participants: { include: { student: { select: { id: true, name: true, email: true } } } },
      _count: { select: { attendances: true, transactions: true } },
    },
    orderBy: { start_time: 'desc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    tutorId: s.tutor_id,
    tutorName: displayProfile(s.tutor.name),
    sessionType: s.session_type as SessionType,
    startTime: s.start_time.toISOString(),
    endTime: s.end_time.toISOString(),
    deadline: computeAttendanceClosesAt(s.end_time, policy.checkInWindowHours).toISOString(),
    attendanceClosesAt: computeAttendanceClosesAt(s.end_time, policy.checkInWindowHours).toISOString(),
    token: s.token,
    status: s.status,
    attendeeCount: s._count.attendances,
    participantCount: s.participants.length,
    transactionCount: s._count.transactions,
    attendanceNotes: s.attendance_notes,
    assignedStudents: s.participants.map(({ student }) => displayProfile(student.name)),
    price: sessionPrice(s.session_type as SessionType, policy),
  }));
}

export async function getAdminSession(sessionId: string, policy: SessionPricingConfig) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new Error('Session not found');
  if (session.historical_only) throw new Error('Historical schedule records are available in Tutor history only');

  return serializeSession(session, policy);
}

export async function updateSession(
  sessionId: string,
  input: CreateSessionInput,
  policy: SessionPricingConfig,
  options?: { markSeriesException?: boolean },
) {
  const validInput = parseSessionInput(input);
  await validateSessionReferences(validInput);
  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      participants: { select: { student_id: true } },
      _count: { select: { attendances: true, transactions: true } },
    },
  });
  if (!existing) throw new Error('Session not found');
  if (existing.historical_only) throw new Error('Historical schedule records cannot be edited');
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw new Error('Completed or cancelled sessions cannot be edited');
  }

  const currentParticipantIds = existing.participants.map((participant) => participant.student_id).sort();
  const nextParticipantIds = [...validInput.participantIds].sort();
  const changesProtectedByHistory = existing._count.attendances > 0 || existing._count.transactions > 0;
  const scheduleChanged = existing.tutor_id !== validInput.tutorId
    || existing.session_type !== validInput.sessionType
    || existing.start_time.toISOString() !== validInput.startTime
    || existing.end_time.toISOString() !== validInput.endTime
    || JSON.stringify(currentParticipantIds) !== JSON.stringify(nextParticipantIds);
  if (changesProtectedByHistory && scheduleChanged) {
    throw new Error('Sessions with attendance or financial history can only change their title');
  }

  const updated = await prisma.$transaction(async (tx) => tx.session.update({
    where: { id: sessionId },
    data: {
      title: validInput.title,
      tutor_id: validInput.tutorId,
      session_type: validInput.sessionType,
      start_time: new Date(validInput.startTime),
      end_time: new Date(validInput.endTime),
      deadline: computeAttendanceClosesAt(new Date(validInput.endTime), policy.checkInWindowHours),
      ...(options?.markSeriesException ? { series_exception: true } : {}),
      participants: {
        deleteMany: {},
        create: validInput.participantIds.map((student_id) => ({ student_id })),
      },
    },
    include: SESSION_INCLUDE,
  }));

  return serializeSession(updated, policy);
}

export async function deleteSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, start_time: true, historical_only: true, _count: { select: { attendances: true, transactions: true } } },
  });
  if (!session) throw new Error('Session not found');
  if (session.historical_only) throw new Error('Historical schedule records cannot be deleted');
  const safeToDelete = session.status === 'SCHEDULED'
    && session.start_time > new Date()
    && session._count.attendances === 0
    && session._count.transactions === 0;
  if (!safeToDelete) throw new Error('This session must be cancelled to preserve its history');

  await prisma.session.delete({ where: { id: sessionId } });
  return { success: true, mode: 'deleted' as const };
}

export async function cancelSession(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, status: true, historical_only: true } });
  if (!session) throw new Error('Session not found');
  if (session.historical_only) throw new Error('Historical schedule records cannot be cancelled');
  if (session.status === 'COMPLETED') throw new Error('Completed sessions cannot be cancelled');

  await prisma.session.update({ where: { id: sessionId }, data: { status: 'CANCELLED' } });
  return { success: true, mode: 'cancelled' as const };
}

export async function rescheduleSessionOccurrence(
  sessionId: string,
  input: { startTime: string; endTime: string; reason: string },
  policy: SessionPricingConfig,
  actor: { id: string; role: 'ADMIN' | 'TUTOR' },
) {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error('End time must be strictly after start time');
  }
  if (input.reason.trim().length < 3) throw new Error('A reschedule reason is required');

  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      tutor_id: true,
      status: true,
      historical_only: true,
      _count: { select: { attendances: true, transactions: true } },
    },
  });
  if (!existing || (actor.role === 'TUTOR' && existing.tutor_id !== actor.id)) {
    throw new Error('Session is not available to this user');
  }
  if (existing.historical_only) throw new Error('Historical schedule records cannot be postponed');
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw new Error('Completed or cancelled sessions cannot be postponed');
  }
  if (existing._count.attendances > 0 || existing._count.transactions > 0) {
    throw new Error('Sessions with attendance or financial history cannot be postponed');
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      start_time: start,
      end_time: end,
      deadline: computeAttendanceClosesAt(end, policy.checkInWindowHours),
      series_exception: true,
      series_exception_reason: input.reason.trim(),
    },
    include: SESSION_INCLUDE,
  });
  return serializeSession(updated, policy);
}

export async function getTutorSessions(tutorId: string, policy: SessionPricingConfig, currentTime = new Date()) {
  await materializeActiveSeriesForTutor(tutorId, policy, currentTime);
  const sessions = await prisma.session.findMany({
    where: { tutor_id: tutorId },
    include: {
      tutor: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
      participants: {
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
      },
      series: { select: { start_minute: true } },
      attendances: { select: { student_id: true } },
    },
    orderBy: { start_time: 'desc' },
  });

  return sessions.map((s) => {
    const attendedIds = new Set(s.attendances.map((a) => a.student_id));
    const assignedStudents = s.participants.map((participant) => displayProfile(participant.student.name));
    const sessionCode = formatSessionCode({
      title: s.title,
      startTime: s.start_time,
      endTime: s.end_time,
    });

    const roster = s.participants.map((participant) => ({
      id: participant.student.id,
      name: displayProfile(participant.student.name),
      email: displayProfile(participant.student.email),
      attended: attendedIds.has(participant.student.id),
    }));

    return {
      id: s.id,
      title: s.title,
      sessionCode,
      tutorId: s.tutor_id,
      tutorName: displayProfile(s.tutor.name),
      sessionType: s.session_type as SessionType,
      startTime: s.start_time.toISOString(),
      endTime: s.end_time.toISOString(),
      deadline: computeAttendanceClosesAt(s.end_time, policy.checkInWindowHours).toISOString(),
      attendanceClosesAt: computeAttendanceClosesAt(s.end_time, policy.checkInWindowHours).toISOString(),
      attendanceSavedAt: s.attendance_saved_at?.toISOString() || null,
      attendanceFinalizedAt: s.attendance_finalized_at?.toISOString() || null,
      attendanceWindowState: getAttendanceWindowState(s.start_time, computeAttendanceClosesAt(s.end_time, policy.checkInWindowHours), currentTime),
      baseStartTime: s.series && s.occurrence_date ? academyDateTime(s.occurrence_date, s.series.start_minute).toISOString() : s.start_time.toISOString(),
      isRescheduled: s.series_exception,
      rescheduleReason: s.series_exception_reason,
      token: s.token,
      status: s.status,
      historicalOnly: s.historical_only,
      attendeeCount: s._count.attendances,
      attendanceNotes: s.attendance_notes,
      assignedStudents,
      roster,
      price: sessionPrice(s.session_type as SessionType, policy),
    };
  });
}

export async function getTutorKPIs(tutorId: string): Promise<TutorVolumeKPIs> {
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId },
    select: { id: true, name: true },
  });

  if (!tutor) {
    throw new Error('Tutor not found');
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Lifetime counts
  const lifetimeSessionCount = await prisma.session.count({
    where: { tutor_id: tutorId, historical_only: false },
  });

  const lifetimeAttendedStudents = await prisma.attendanceRecord.count({
    where: { session: { tutor_id: tutorId, historical_only: false } },
  });

  // Monthly counts
  const monthlySessionCount = await prisma.session.count({
    where: {
      tutor_id: tutorId,
      historical_only: false,
      start_time: { gte: startOfMonth },
    },
  });

  const monthlyAttendedStudents = await prisma.attendanceRecord.count({
    where: {
      session: {
        tutor_id: tutorId,
        historical_only: false,
        start_time: { gte: startOfMonth },
      },
    },
  });

  return {
    tutorId: tutor.id,
    tutorName: displayProfile(tutor.name),
    monthlySessionCount,
    lifetimeSessionCount,
    monthlyAttendedStudents,
    lifetimeAttendedStudents,
  };
}
