import { requireAuth } from '@/features/auth/server/session';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
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

export async function getTutorDashboardData(view: 'full' | 'agenda' = 'full'): Promise<TutorDashboardData> {
  const authSession = await requireAuth(['TUTOR']);
  const tutorId = authSession.userId;
  const tutorName = authSession.name;

  const currentTime = new Date();
  const platformPolicy = await getPlatformPolicies();
  const sessions = view === 'agenda'
    ? await getTutorSessions(tutorId, platformPolicy, currentTime, { mode: 'agenda', horizonDays: 7 })
    : await getTutorSessions(tutorId, platformPolicy, currentTime);
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
