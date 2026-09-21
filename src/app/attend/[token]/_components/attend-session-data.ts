import { prisma } from '@/shared/lib/prisma';
import type { SessionType } from '@/shared/types';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { getSession } from '@/features/auth/server/session';

export async function getAttendSessionData(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      tutor: { select: { name: true } },
    },
  });

  if (!session) return null;

  const policy = await getPlatformPolicies();

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
      price: session.session_type === 'PRIVATE' ? policy.privateSessionPrice : policy.groupSessionPrice,
      tutorName: session.tutor.name,
    },
    userId: userSession?.userId,
    alreadyCheckedIn,
  };
}
