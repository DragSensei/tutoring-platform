import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { requireAuth } from '@/shared/server/session';

export const LINKED_STUDENT_DISCOUNT = 100;
export interface LinkedStudentCandidate { id: string; name: string; email: string | null }

export function canonicalStudentPair(firstId: string, secondId: string) {
  if (firstId === secondId) throw new Error('A Student cannot be linked to themselves');
  return firstId < secondId
    ? { student_a_id: firstId, student_b_id: secondId }
    : { student_a_id: secondId, student_b_id: firstId };
}

export async function createLinkedRelationshipTx(
  tx: Prisma.TransactionClient,
  firstId: string,
  secondId: string,
  adminId: string,
) {
  const pair = canonicalStudentPair(firstId, secondId);
  const [first, second, occupied] = await Promise.all([
    tx.user.findUnique({ where: { id: firstId }, select: { id: true, role: true } }),
    tx.user.findUnique({ where: { id: secondId }, select: { id: true, role: true, account_status: true } }),
    tx.linkedStudentRelationship.findFirst({
      where: { active: true, OR: [{ student_a_id: firstId }, { student_b_id: firstId }, { student_a_id: secondId }, { student_b_id: secondId }] },
      select: { id: true },
    }),
  ]);
  if (!first || !second || first.role !== 'STUDENT' || second.role !== 'STUDENT') {
    throw new Error('Both linked accounts must still exist as Students');
  }
  if (second.account_status !== 'ACTIVE') throw new Error('Choose an active Student to link');
  if (occupied) throw new Error('One of these Students is already in an active linked pair');
  try {
    return await tx.linkedStudentRelationship.create({
      data: { ...pair, discount_amount: LINKED_STUDENT_DISCOUNT, created_by_admin_id: adminId },
      select: { id: true, student_a_id: true, student_b_id: true, discount_amount: true, active: true, created_at: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('One of these Students is already in an active linked pair');
    }
    throw error;
  }
}

export async function endLinkedRelationshipTx(tx: Prisma.TransactionClient, studentId: string, adminId: string) {
  const relationship = await tx.linkedStudentRelationship.findFirst({
    where: { active: true, OR: [{ student_a_id: studentId }, { student_b_id: studentId }] },
    select: { id: true },
  });
  if (!relationship) return false;
  await tx.linkedStudentRelationship.update({
    where: { id: relationship.id },
    data: { active: false, ended_at: new Date(), ended_by_admin_id: adminId },
  });
  return true;
}

export async function getLinkedStudentCandidates(studentId?: string) {
  await requireAuth(['ADMIN']);
  const occupied = await prisma.linkedStudentRelationship.findMany({
    where: { active: true },
    select: { student_a_id: true, student_b_id: true },
  });
  const unavailableIds = new Set(occupied.flatMap((pair) => [pair.student_a_id, pair.student_b_id]));
  const currentPartnerId = studentId
    ? occupied.flatMap((pair) => pair.student_a_id === studentId ? [pair.student_b_id] : pair.student_b_id === studentId ? [pair.student_a_id] : [])[0]
    : undefined;
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', account_status: 'ACTIVE', ...(studentId ? { id: { not: studentId } } : {}) },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
  return students
    .filter((student) => !unavailableIds.has(student.id) || student.id === currentPartnerId)
    .map((student) => ({ id: student.id, name: student.name || 'Profile incomplete', email: student.email }));
}
