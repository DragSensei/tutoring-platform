'use server';

import { requireAuth } from '@/features/auth/server/session';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { revalidatePath } from 'next/cache';
import {
  cancelSession,
  createSession,
  deleteSession,
  getAdminSession as getSessionRecord,
  updateSession,
} from '@/features/sessions/server/session-actions';
import type { CreateSessionInput } from '@/features/sessions/schemas';

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

function revalidateSessionSurfaces() {
  revalidatePath('/admin/gadwal');
  revalidatePath('/admin/gadwal/new');
  revalidatePath('/tutor/agenda');
  revalidatePath('/tutor/dashboard');
  revalidatePath('/student/dashboard');
}
