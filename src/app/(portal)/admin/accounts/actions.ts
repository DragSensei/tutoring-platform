'use server';

import { requireAuth } from '@/features/auth/server/session';
import { createAccount, createReferralSource, initiateAccountSetup, initiatePasswordReset, updateAccountProfileTx } from '@/features/accounts/server/account-actions';
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
  await requireAuth(['ADMIN']);
  const result = await prisma.$transaction((tx) => updateAccountProfileTx(tx, userId, input), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
