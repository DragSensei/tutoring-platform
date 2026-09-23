import bcrypt from 'bcryptjs';
import { prisma } from '@/shared/lib/prisma';
import { Role } from '@/shared/types';
import { setSessionCookie } from '@/shared/server/session';
import type { SessionPayload } from '@/shared/server/session';
import { LoginInput } from '../schemas';

export { clearSessionCookie, getSession, requireAuth, signSessionToken, verifySessionToken, setSessionCookie } from '@/shared/server/session';
export type { SessionPayload } from '@/shared/server/session';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(input: LoginInput): Promise<{
  success: boolean;
  user?: SessionPayload;
  error?: string;
  code?: 'PASSWORD_SETUP_REQUIRED' | 'PROFILE_COMPLETION_REQUIRED';
}> {
  const identifier = input.identifier.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    },
  });

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (!user.password_hash) {
    return { success: false, error: 'Invalid email or password' };
  }

  const isValid = await verifyPassword(input.password, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (user.account_status === 'PENDING_PROFILE' || !user.name || !user.email || !user.phone) {
    return { success: false, error: 'Complete your profile before entering the portal', code: 'PROFILE_COMPLETION_REQUIRED' };
  }
  if (user.account_status !== 'ACTIVE') {
    return { success: false, error: 'Your account is not ready for portal access' };
  }

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  };

  await setSessionCookie(payload);
  return { success: true, user: payload };
}
