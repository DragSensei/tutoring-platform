'use server';

import { requireAuth } from '@/features/auth/server/session';
import { createSession } from '@/features/sessions/server/session-actions';
import type { CreateSessionInput } from '@/features/sessions/schemas';

/** Admin orchestration boundary for the session domain operation. */
export async function createAdminSession(input: CreateSessionInput) {
  await requireAuth(['ADMIN']);
  return createSession(input);
}
