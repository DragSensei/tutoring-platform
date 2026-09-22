'use server';

import { completePasswordReset as completePasswordResetDomain } from '@/features/accounts/server/account-actions';
import { hashPassword } from '@/features/auth/server/session';
import type { PasswordResetInput } from '@/features/accounts/schemas';

export async function completePasswordReset(input: PasswordResetInput) {
  return completePasswordResetDomain(input, { hashPassword });
}
