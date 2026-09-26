'use server';

import { requireAuth } from '@/features/auth/server/session';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { getTutorSessions, rescheduleSessionOccurrence } from '@/features/sessions/server/session-actions';
import { revalidatePath } from 'next/cache';

export async function getTutorUpcomingSessions(horizon: 14 | 30 | 'all') {
  const auth = await requireAuth(['TUTOR']);
  return getTutorSessions(auth.userId, await getPlatformPolicies(), new Date(), {
    mode: 'upcoming',
    horizonDays: horizon === 'all' ? null : horizon,
  });
}

export async function postponeTutorSession(
  sessionId: string,
  input: { startTime: string; endTime: string; reason: string },
) {
  const auth = await requireAuth(['TUTOR']);
  const result = await rescheduleSessionOccurrence(
    sessionId,
    input,
    await getPlatformPolicies(),
    { id: auth.userId, role: 'TUTOR' },
  );
  revalidatePath('/tutor/agenda');
  revalidatePath('/tutor/timetable');
  revalidatePath('/tutor/attendance');
  return result;
}
