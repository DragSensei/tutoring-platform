'use server';

import { requireAuth } from '@/features/auth/server/session';
import { createAccount, createReferralSource, getAccountDeletionImpact, initiateAccountSetup, initiatePasswordReset, permanentlyDeleteAccount, setAccountActive, updateAccountProfileTx, updateReferralSource } from '@/features/accounts/server/account-actions';
import { confirmStudentImport as confirmImport, previewStudentImport as previewImport } from '@/features/accounts/server/student-import';
import type { CreateAccountInput, UpdateAccountProfileInput } from '@/features/accounts/schemas';
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createAdminAccount(input: CreateAccountInput) {
  await requireAuth(['ADMIN']);
  const result = await createAccount(input);
  revalidatePath('/admin/accounts');
  return result;
}

export async function updateAdminAccount(userId: string, input: UpdateAccountProfileInput) {
  const admin = await requireAuth(['ADMIN']);
  const result = await prisma.$transaction((tx) => updateAccountProfileTx(tx, userId, input, admin.userId), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  }).catch((error: unknown) => {
    if (input.linkedStudentId && error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      throw new Error('This Student was linked to another active pair at the same time. Refresh the account and try again.');
    }
    throw error;
  });
  revalidatePath('/admin/accounts');
  revalidatePath(`/admin/accounts/${userId}`);
  revalidatePath(`/admin/accounts/${userId}/edit`);
  return {
    id: result.id,
    role: result.role,
    name: result.name,
    email: result.email,
    phone: result.phone,
    referralSourceId: result.referral_source_id,
    tutorHourlyRateOverride: result.tutor_hourly_rate_override?.toFixed(2) ?? null,
  };
}

export async function createAdminReferralSource(input: { name: string; kind: 'REFERRAL' | 'SALES' }) {
  await requireAuth(['ADMIN']);
  const source = await createReferralSource(input);
  revalidatePath('/admin/accounts');
  return source;
}

export async function updateAdminReferralSource(input: { id: string; name?: string; kind?: 'REFERRAL' | 'SALES'; isActive?: boolean }) {
  await requireAuth(['ADMIN']);
  const source = await updateReferralSource(input);
  revalidatePath('/admin/accounts');
  return source;
}

export async function setAdminAccountActive(userId: string, active: boolean) {
  await requireAuth(['ADMIN']);
  const result = await setAccountActive(userId, active);
  revalidatePath('/admin/accounts');
  revalidatePath(`/admin/accounts/${userId}`);
  return result;
}

export async function getAdminAccountDeletionImpact(userId: string) {
  await requireAuth(['ADMIN']);
  return getAccountDeletionImpact(userId);
}

export async function permanentlyDeleteAdminAccount(userId: string, phrase: string) {
  await requireAuth(['ADMIN']);
  const result = await permanentlyDeleteAccount(userId, phrase);
  revalidatePath('/admin/accounts');
  return result;
}

export async function previewAdminStudentImport(input: unknown) {
  return previewImport(input);
}

export async function confirmAdminStudentImport(input: unknown) {
  const result = await confirmImport(input);
  revalidatePath('/admin/accounts');
  return result;
}

export async function issueAdminAccountSetupLink(userId: string) {
  await requireAuth(['ADMIN']);
  return initiateAccountSetup(userId);
}

export async function issueAdminPasswordResetLink(userId: string) {
  await requireAuth(['ADMIN']);
  return initiatePasswordReset(userId);
}
