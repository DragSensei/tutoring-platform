import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { requireAuth } from '@/features/auth/server/session';
import { prisma } from '@/shared/lib/prisma';

export async function getAdminSessionFormData() {
  await requireAuth(['ADMIN']);
  const [tutors, students, policy] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'TUTOR' },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    getPlatformPolicies(),
  ]);

  return { tutors, students, policy };
}
