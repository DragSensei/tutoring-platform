import { prisma } from '@/shared/lib/prisma';
import { computeSessionDeadline } from '@/shared/utils/deadline';
import { SESSION_PRICING, SessionType, TutorVolumeKPIs } from '@/shared/types';
import { formatSessionCode } from '@/shared/utils/session-code';
import { CreateSessionInput, SessionFilterInput } from '../schemas';
import crypto from 'crypto';

export async function createSession(input: CreateSessionInput) {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (end <= start) {
    throw new Error('End time must be strictly after start time');
  }

  // 4-Hour deadline invariant
  const deadline = computeSessionDeadline(start);
  const token = crypto.randomUUID();

  return prisma.session.create({
    data: {
      title: input.title,
      tutor_id: input.tutorId,
      session_type: input.sessionType as SessionType,
      start_time: start,
      end_time: end,
      deadline,
      token,
      status: 'SCHEDULED',
    },
    include: {
      tutor: {
        select: { id: true, name: true, email: true },
      },
    },
  });
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
    price: SESSION_PRICING[s.session_type as SessionType],
  }));
}

export async function getTutorSessions(tutorId: string) {
  const [sessions, allStudents] = await Promise.all([
    prisma.session.findMany({
      where: { tutor_id: tutorId },
      include: {
        tutor: { select: { id: true, name: true } },
        _count: { select: { attendances: true } },
        attendances: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { start_time: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        wallet: { select: { balance: true, is_flagged_overdraft: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return sessions.map((s) => {
    const attendedIds = new Set(s.attendances.map((a) => a.student.id));
    const assignedStudents = s.attendances.map((a) => a.student.name);
    const sessionCode = formatSessionCode({
      title: s.title,
      startTime: s.start_time,
      endTime: s.end_time,
    });

    const cohortPool =
      s.session_type === 'PRIVATE' ? allStudents.slice(0, 1) : allStudents.slice(0, 4);
    const roster = cohortPool.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      walletBalance: Number(student.wallet?.balance || 0),
      isFlaggedOverdraft: Boolean(student.wallet?.is_flagged_overdraft),
      attended: attendedIds.has(student.id),
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
