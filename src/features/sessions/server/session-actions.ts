import { prisma } from '@/shared/lib/prisma';
import { computeSessionDeadline } from '@/shared/utils/deadline';
import { SESSION_PRICING, SessionType, TutorVolumeKPIs } from '@/shared/types';
import { formatSessionCode } from '@/shared/utils/session-code';
import { CreateSessionInput, SessionFilterInput } from '../schemas';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function createSession(input: CreateSessionInput) {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (end <= start) {
    throw new Error('End time must be strictly after start time');
  }

  // Configurable deadline invariant
  const policy = await prisma.platformPolicy.findUnique({ where: { id: 'default' } });
  const windowHours = policy?.check_in_window_hours ?? 4;
  const deadline = computeSessionDeadline(start, windowHours);
  const token = crypto.randomUUID();
  const participantIds = [...new Set(input.participantIds)];

  if (input.sessionType === 'PRIVATE' && participantIds.length !== 1) {
    throw new Error('Private sessions require exactly one student');
  }
  if (input.sessionType === 'GROUP' && (participantIds.length < 1 || participantIds.length > 4)) {
    throw new Error('Group sessions require one to four students');
  }

  const students = await prisma.user.findMany({
    where: { id: { in: participantIds }, role: 'STUDENT' },
    select: { id: true },
  });
  if (students.length !== participantIds.length) {
    throw new Error('Every assigned participant must be a Student account');
  }

  const session = await prisma.$transaction(async (tx) => {
    return tx.session.create({
      data: {
        title: input.title,
        tutor_id: input.tutorId,
        session_type: input.sessionType as SessionType,
        start_time: start,
        end_time: end,
        deadline,
        token,
        status: 'SCHEDULED',
        participants: {
          create: participantIds.map((student_id) => ({ student_id })),
        },
      },
      include: {
        tutor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  });

  try {
    revalidatePath('/admin/gadwal');
  } catch {}

  return session;
}

export async function getGadwalSessions(filter?: SessionFilterInput) {
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
      _count: { select: { attendances: true } },
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
    attendanceNotes: s.attendance_notes,
    price: SESSION_PRICING[s.session_type as SessionType],
  }));
}

export async function getTutorSessions(tutorId: string) {
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
      price: SESSION_PRICING[s.session_type as SessionType],
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
