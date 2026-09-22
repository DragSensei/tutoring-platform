'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/features/auth/server/session';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { rescheduleSessionOccurrence } from '@/features/sessions/server/session-actions';

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
