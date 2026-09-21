import { prisma } from '@/shared/lib/prisma';
import { SESSION_PRICING, SessionType } from '@/shared/types';
import { getSession } from '@/features/auth/server/session';

export async function getAttendSessionData(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      tutor: { select: { name: true } },
    },
  });

  if (!session) return null;

  const userSession = await getSession();
  let alreadyCheckedIn = false;

  if (userSession?.userId && userSession.role === 'STUDENT') {
    const participant = await prisma.sessionParticipant.findUnique({
      where: {
        session_id_student_id: {
          session_id: session.id,
          student_id: userSession.userId,
        },
      },
    });
    if (!participant) return null;

    const record = await prisma.attendanceRecord.findUnique({
      where: {
        session_id_student_id: {
          session_id: session.id,
          student_id: userSession.userId,
        },
      },
    });
    alreadyCheckedIn = !!record;
  }

  return {
    sessionData: {
      title: session.title,
      sessionType: session.session_type as SessionType,
      startTime: session.start_time.toISOString(),
      deadline: session.deadline.toISOString(),
      price: SESSION_PRICING[session.session_type as SessionType],
      tutorName: session.tutor.name,
    },
    userId: userSession?.userId,
    alreadyCheckedIn,
  };
}
