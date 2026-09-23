'use server';

import { requireAuth } from '@/features/auth/server/session';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { revalidatePath } from 'next/cache';
import {
  cancelSession,
  createSession,
  deleteSession,
  getAdminSession as getSessionRecord,
  rescheduleSessionOccurrence,
  updateSession,
} from '@/features/sessions/server/session-actions';
import {
  cancelSessionSeries,
  createSessionSeries,
  getAdminWeeklySchedule,
  getSessionSeries,
  previewHistoricalSeries,
  updateSessionSeries,
} from '@/features/sessions/server/series-actions';
import type { CreateSessionInput, RecurrenceScope, SessionSeriesInput } from '@/features/sessions/schemas';

/** Admin orchestration boundary for the session domain operation. */
export async function createAdminSession(input: CreateSessionInput) {
  await requireAuth(['ADMIN']);
  const result = await createSession(input, await getPlatformPolicies());
  revalidateSessionSurfaces();
  return result;
}

export async function updateAdminSession(sessionId: string, input: CreateSessionInput) {
  await requireAuth(['ADMIN']);
  const result = await updateSession(sessionId, input, await getPlatformPolicies());
  revalidateSessionSurfaces();
  return result;
}

export async function postponeAdminSession(
  sessionId: string,
  input: { startTime: string; endTime: string; reason: string },
) {
  const auth = await requireAuth(['ADMIN']);
  const result = await rescheduleSessionOccurrence(
    sessionId,
    input,
    await getPlatformPolicies(),
    { id: auth.userId, role: 'ADMIN' },
  );
  revalidateSessionSurfaces();
  return result;
}

export async function deleteAdminSession(sessionId: string) {
  await requireAuth(['ADMIN']);
  const result = await deleteSession(sessionId);
  revalidateSessionSurfaces();
  return result;
}

export async function cancelAdminSession(sessionId: string) {
  await requireAuth(['ADMIN']);
  const result = await cancelSession(sessionId);
  revalidateSessionSurfaces();
  return result;
}

export async function getAdminSession(sessionId: string) {
  await requireAuth(['ADMIN']);
  return getSessionRecord(sessionId, await getPlatformPolicies());
}

export async function previewAdminHistoricalSeries(input: SessionSeriesInput, seriesId?: string) {
  await requireAuth(['ADMIN']);
  return previewHistoricalSeries(input, seriesId);
}

export async function createAdminSeries(input: SessionSeriesInput, confirmedHistoricalDates?: string[]) {
  await requireAuth(['ADMIN']);
  const result = await createSessionSeries(input, await getPlatformPolicies(), confirmedHistoricalDates);
  revalidateSessionSurfaces();
  return result;
}

export async function updateAdminSeries(
  seriesId: string,
  input: SessionSeriesInput,
  scope: RecurrenceScope,
  effectiveOccurrenceId?: string,
  confirmedHistoricalDates?: string[],
) {
  await requireAuth(['ADMIN']);
  const result = await updateSessionSeries(seriesId, input, scope, await getPlatformPolicies(), effectiveOccurrenceId, confirmedHistoricalDates);
  revalidateSessionSurfaces();
  return result;
}

export async function cancelAdminSeries(
  seriesId: string,
  scope: RecurrenceScope,
  effectiveOccurrenceId?: string,
) {
  await requireAuth(['ADMIN']);
  const result = await cancelSessionSeries(seriesId, scope, await getPlatformPolicies(), effectiveOccurrenceId);
  revalidateSessionSurfaces();
  return result;
}

export async function getAdminSeries(seriesId: string) {
  await requireAuth(['ADMIN']);
  return getSessionSeries(seriesId, await getPlatformPolicies());
}

export async function getAdminWeeklySeries(tutorId?: string) {
  await requireAuth(['ADMIN']);
  return getAdminWeeklySchedule(tutorId, await getPlatformPolicies());
}

function revalidateSessionSurfaces() {
  revalidatePath('/admin/gadwal');
  revalidatePath('/admin/gadwal/new');
  revalidatePath('/tutor/agenda');
  revalidatePath('/tutor/dashboard');
  revalidatePath('/tutor/timetable');
  revalidatePath('/student/dashboard');
}
