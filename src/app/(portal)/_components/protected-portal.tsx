import type { Role } from '@/shared/types';
import { getSession } from '@/shared/server/session';

export async function hasPortalAccess(role: Role): Promise<boolean> {
  const session = await getSession();
  return Boolean(session && session.role === role);
}
