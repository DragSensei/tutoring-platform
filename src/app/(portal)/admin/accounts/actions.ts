'use server';

import { requireAuth } from '@/features/auth/server/session';
import { createAccount, initiateAccountSetup, initiatePasswordReset } from '@/features/accounts/server/account-actions';
import type { CreateAccountInput } from '@/features/accounts/schemas';

export async function createAdminAccount(input: CreateAccountInput) {
  await requireAuth(['ADMIN']);
  return createAccount(input);
}

export async function issueAdminAccountSetupLink(userId: string) {
  await requireAuth(['ADMIN']);
  return initiateAccountSetup(userId);
}

export async function issueAdminPasswordResetLink(userId: string) {
  await requireAuth(['ADMIN']);
  return initiatePasswordReset(userId);
}
