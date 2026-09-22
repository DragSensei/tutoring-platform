'use server';

import { completeAccountSetup as completeAccountSetupDomain } from '@/features/accounts/server/account-actions';
import { hashPassword, setSessionCookie } from '@/features/auth/server/session';
import type { AccountSetupInput } from '@/features/accounts/schemas';

export async function completeAccountSetup(input: AccountSetupInput) {
  return completeAccountSetupDomain(input, { hashPassword, setSessionCookie });
}
