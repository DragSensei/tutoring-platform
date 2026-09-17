import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/features/auth/server/session';
import { getTutorSessions } from '@/features/sessions/server/session-actions';
import type { GadwalSessionItem } from '@/features/sessions/types';
import {
  findClosestSessionDue,
  ClosestSessionDue,
  DueCountdown,
  computeDueCountdown,
} from './timer-utils';

export {
  findClosestSessionDue,
  computeDueCountdown,
  type ClosestSessionDue,
  type DueCountdown,
};

export interface TutorDashboardData {
  tutor: {
    id: string;
    name: string;
  };
  closestSession: ClosestSessionDue | null;
  sessions: GadwalSessionItem[];
}

export async function getTutorDashboardData(): Promise<TutorDashboardData> {
  const authSession = await getSession();
  let tutorId = authSession?.userId;
  let tutorName = authSession?.name || 'Faculty Mentor';

  if (!tutorId || authSession?.role !== 'TUTOR') {
    const firstTutor = await prisma.user.findFirst({
      where: { role: 'TUTOR' },
      select: { id: true, name: true },
    });

    if (firstTutor) {
      tutorId = firstTutor.id;
      tutorName = firstTutor.name;
    } else {
      // Create dev faculty tutor if database is empty
      const defaultTutor = await prisma.user.create({
        data: {
          name: 'Eng. Omar Ashraf',
          email: 'omar.ashraf@bigherorobotics.com',
          phone: '+201000000099',
          password_hash: 'seed_hash',
          role: 'TUTOR',
        },
      });
      tutorId = defaultTutor.id;
      tutorName = defaultTutor.name;
    }
  }

  const sessions = await getTutorSessions(tutorId);
  const closestSession = findClosestSessionDue(sessions);

  return {
    tutor: {
      id: tutorId,
      name: tutorName,
    },
    closestSession,
    sessions,
  };
}
