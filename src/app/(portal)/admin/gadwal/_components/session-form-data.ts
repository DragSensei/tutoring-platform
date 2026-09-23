import { getActivePricingProfiles, getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { requireAuth } from '@/features/auth/server/session';
import { prisma } from '@/shared/lib/prisma';

export async function getAdminSessionFormData() {
  await requireAuth(['ADMIN']);
  const [tutors, students, policy] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'TUTOR', account_status: 'ACTIVE', name: { not: null }, email: { not: null } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', account_status: 'ACTIVE', name: { not: null }, email: { not: null } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    getPlatformPolicies(),
  ]);

  return {
    tutors: tutors.flatMap((person) => person.name && person.email ? [{ id: person.id, name: person.name, email: person.email }] : []),
    students: students.flatMap((person) => person.name && person.email ? [{ id: person.id, name: person.name, email: person.email }] : []),
    policy,
  };
}

export async function getAdminSeriesFormData() {
  const [sessionFormData, pricingProfiles] = await Promise.all([
    getAdminSessionFormData(),
    getActivePricingProfiles(),
  ]);
  return { ...sessionFormData, pricingProfiles };
}
