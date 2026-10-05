import { getActivePricingProfiles, getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { requireAuth } from '@/features/auth/server/session';
import { prisma } from '@/shared/lib/prisma';
import { collectPrismaPages } from '@/shared/lib/prisma-pagination';

export async function getAdminSessionFormData() {
  await requireAuth(['ADMIN']);
  const [tutors, students, policy] = await Promise.all([
    collectPrismaPages((cursorId) => prisma.user.findMany({
      where: { role: 'TUTOR', account_status: 'ACTIVE', name: { not: null }, email: { not: null } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 200,
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
    })),
    collectPrismaPages((cursorId) => prisma.user.findMany({
      where: { role: 'STUDENT', account_status: 'ACTIVE', name: { not: null }, email: { not: null } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 200,
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
    })),
    getPlatformPolicies(),
  ]);

  return {
    tutors: tutors.flatMap((person) => person.name && person.email ? [{ id: person.id, name: person.name, email: person.email }] : []),
    students: students.flatMap((person) => person.name && person.email ? [{ id: person.id, name: person.name, email: person.email }] : []),
    policy,
  };
}

export async function getAdminSeriesFormData() {
  await requireAuth(['ADMIN']);
  const [tutors, students, policy, pricingProfiles] = await Promise.all([
    collectPrismaPages((cursorId) => prisma.user.findMany({ where: { role: 'TUTOR', account_status: { not: 'DEACTIVATED' }, name: { not: null } }, select: { id: true, name: true, email: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 200, cursor: cursorId ? { id: cursorId } : undefined, skip: cursorId ? 1 : 0 })),
    collectPrismaPages((cursorId) => prisma.user.findMany({ where: { role: 'STUDENT', account_status: { not: 'DEACTIVATED' }, name: { not: null } }, select: { id: true, name: true, email: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 200, cursor: cursorId ? { id: cursorId } : undefined, skip: cursorId ? 1 : 0 })),
    getPlatformPolicies(),
    getActivePricingProfiles(),
  ]);
  return {
    tutors: tutors.flatMap((person) => person.name ? [{ id: person.id, name: person.name, email: person.email ?? '' }] : []),
    students: students.flatMap((person) => person.name ? [{ id: person.id, name: person.name, email: person.email ?? '' }] : []),
    policy,
    pricingProfiles,
  };
}
