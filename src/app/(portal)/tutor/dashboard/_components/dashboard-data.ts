import { requireAuth } from '@/features/auth/server/session';
import { getTutorSessions } from '@/features/sessions/server/session-actions';
import type { GadwalSessionItem } from '@/features/sessions/types';
import {
  findClosestSessionDue,
  type ClosestSessionDue,
} from './timer-utils';

export interface TutorDashboardData {
  tutor: {
    id: string;
    name: string;
  };
  closestSession: ClosestSessionDue | null;
  sessions: GadwalSessionItem[];
}

export async function getTutorDashboardData(): Promise<TutorDashboardData> {
  const authSession = await requireAuth(['TUTOR']);
  const tutorId = authSession.userId;
  const tutorName = authSession.name;

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
