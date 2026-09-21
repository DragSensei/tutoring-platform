import { prisma } from '@/shared/lib/prisma';
import { computeSessionDeadline } from '@/shared/utils/deadline';
import type { SessionType, TutorVolumeKPIs } from '@/shared/types';
import { formatSessionCode } from '@/shared/utils/session-code';
import { createSessionSchema, type CreateSessionInput, type SessionFilterInput } from '../schemas';
import crypto from 'crypto';

export interface SessionPricingConfig {
  checkInWindowHours: number;
  groupSessionPrice: number;
  privateSessionPrice: number;
}

const SESSION_INCLUDE = {
  tutor: { select: { id: true, name: true, email: true } },
  participants: {
    include: { student: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { attendances: true, transactions: true } },
} as const;

function sessionPrice(sessionType: SessionType, policy: SessionPricingConfig): number {
  return sessionType === 'PRIVATE' ? policy.privateSessionPrice : policy.groupSessionPrice;
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
  session: Awaited<ReturnType<typeof prisma.session.findUniqueOrThrow>> & {
    tutor: { id: string; name: string; email: string };
    participants: { student: { id: string; name: string; email: string } }[];
    _count: { attendances: number; transactions: number };
  },
  policy: SessionPricingConfig
) {
  return {
    id: session.id,
    title: session.title,
    tutorId: session.tutor_id,
    tutorName: session.tutor.name,
    sessionType: session.session_type as SessionType,
    startTime: session.start_time.toISOString(),
    endTime: session.end_time.toISOString(),
    deadline: session.deadline.toISOString(),
    token: session.token,
    status: session.status,
    attendeeCount: session._count.attendances,
    participantCount: session.participants.length,
    transactionCount: session._count.transactions,
    attendanceNotes: session.attendance_notes,
    assignedStudents: session.participants.map(({ student }) => student.name),
    roster: session.participants.map(({ student }) => ({ ...student, attended: false })),
    price: sessionPrice(session.session_type as SessionType, policy),
  };
}

export async function createSession(input: CreateSessionInput, policy: SessionPricingConfig) {
  const validInput = parseSessionInput(input);
  const start = new Date(validInput.startTime);
  const end = new Date(validInput.endTime);
  await validateSessionReferences(validInput);
  const windowHours = policy.checkInWindowHours;
  const deadline = computeSessionDeadline(start, windowHours);
  const token = crypto.randomUUID();

  const session = await prisma.$transaction(async (tx) => {
    return tx.session.create({
      data: {
        title: validInput.title,
        tutor_id: validInput.tutorId,
        session_type: validInput.sessionType,
        start_time: start,
        end_time: end,
        deadline,
        token,
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
    status?: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    start_time?: { gte?: Date; lte?: Date };
  } = {};

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
    tutorName: s.tutor.name,
    sessionType: s.session_type as SessionType,
    startTime: s.start_time.toISOString(),
    endTime: s.end_time.toISOString(),
    deadline: s.deadline.toISOString(),
    token: s.token,
    status: s.status,
    attendeeCount: s._count.attendances,
    participantCount: s.participants.length,
    transactionCount: s._count.transactions,
    attendanceNotes: s.attendance_notes,
    assignedStudents: s.participants.map(({ student }) => student.name),
    price: sessionPrice(s.session_type as SessionType, policy),
  }));
}

export async function getAdminSession(sessionId: string, policy: SessionPricingConfig) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new Error('Session not found');

  return serializeSession(session, policy);
}

export async function updateSession(sessionId: string, input: CreateSessionInput, policy: SessionPricingConfig) {
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
      deadline: computeSessionDeadline(new Date(validInput.startTime), policy.checkInWindowHours),
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
    select: { id: true, status: true, start_time: true, _count: { select: { attendances: true, transactions: true } } },
  });
  if (!session) throw new Error('Session not found');
  const safeToDelete = session.status === 'SCHEDULED'
    && session.start_time > new Date()
    && session._count.attendances === 0
    && session._count.transactions === 0;
  if (!safeToDelete) throw new Error('This session must be cancelled to preserve its history');

  await prisma.session.delete({ where: { id: sessionId } });
  return { success: true, mode: 'deleted' as const };
}

export async function cancelSession(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, status: true } });
  if (!session) throw new Error('Session not found');
  if (session.status === 'COMPLETED') throw new Error('Completed sessions cannot be cancelled');

  await prisma.session.update({ where: { id: sessionId }, data: { status: 'CANCELLED' } });
  return { success: true, mode: 'cancelled' as const };
}

export async function getTutorSessions(tutorId: string, policy: SessionPricingConfig) {
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
      attendances: { select: { student_id: true } },
    },
    orderBy: { start_time: 'desc' },
  });

  return sessions.map((s) => {
    const attendedIds = new Set(s.attendances.map((a) => a.student_id));
    const assignedStudents = s.participants.map((participant) => participant.student.name);
    const sessionCode = formatSessionCode({
      title: s.title,
      startTime: s.start_time,
      endTime: s.end_time,
    });

    const roster = s.participants.map((participant) => ({
      id: participant.student.id,
      name: participant.student.name,
      email: participant.student.email,
      attended: attendedIds.has(participant.student.id),
    }));

    return {
      id: s.id,
      title: s.title,
      sessionCode,
      tutorId: s.tutor_id,
      tutorName: s.tutor.name,
      sessionType: s.session_type as SessionType,
      startTime: s.start_time.toISOString(),
      endTime: s.end_time.toISOString(),
      deadline: s.deadline.toISOString(),
      token: s.token,
      status: s.status,
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
    where: { tutor_id: tutorId },
  });

  const lifetimeAttendedStudents = await prisma.attendanceRecord.count({
    where: { session: { tutor_id: tutorId } },
  });

  // Monthly counts
  const monthlySessionCount = await prisma.session.count({
    where: {
      tutor_id: tutorId,
      start_time: { gte: startOfMonth },
    },
  });

  const monthlyAttendedStudents = await prisma.attendanceRecord.count({
    where: {
      session: {
        tutor_id: tutorId,
        start_time: { gte: startOfMonth },
      },
    },
  });

  return {
    tutorId: tutor.id,
    tutorName: tutor.name,
    monthlySessionCount,
    lifetimeSessionCount,
    monthlyAttendedStudents,
    lifetimeAttendedStudents,
  };
}
