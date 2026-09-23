import crypto from 'node:crypto';
import { Prisma, type ReferralSourceKind } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { requireAuth } from '@/shared/server/session';
import type { Role } from '@/shared/types';
import {
  accountSetupSchema,
  createAccountSchema,
  createReferralSourceSchema,
  passwordResetSchema,
  type AccountSetupInput,
  type CreateAccountInput,
  type PasswordResetInput,
  updateAccountProfileSchema,
  type UpdateAccountProfileInput,
} from '../schemas';

export const ACCOUNT_SETUP_TTL_MINUTES = 30;
export const ACCOUNT_PASSWORD_RESET_TTL_MINUTES = 30;
type AccountTokenPurpose = 'SETUP' | 'PASSWORD_RESET';

function normalize(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newAccountToken() {
  const raw = crypto.randomBytes(32).toString('base64url');
  return { raw, hash: tokenHash(raw) };
}

function profileComplete(profile: { name: string | null; email: string | null; phone: string | null }) {
  return Boolean(profile.name && profile.email && profile.phone);
}

function dataSourceId(value?: string | null) {
  return normalize(value ?? undefined);
}

async function activeReferralSource(tx: Prisma.TransactionClient, id: string) {
  const source = await tx.referralSource.findUnique({
    where: { id },
    select: { id: true, kind: true, is_active: true },
  });
  if (!source || !source.is_active) throw new Error('Choose an active referral source');
  return source;
}

export interface ReferralSourceItem {
  id: string;
  name: string;
  kind: ReferralSourceKind;
  isActive: boolean;
}

export async function getReferralSources(): Promise<ReferralSourceItem[]> {
  await requireAuth(['ADMIN']);
  const direct = await prisma.referralSource.upsert({
    where: { id: 'direct' },
    create: { id: 'direct', name: 'Direct', normalized_name: 'direct', kind: 'DIRECT' },
    update: { is_active: true },
    select: { name: true, normalized_name: true, kind: true, is_active: true },
  });
  if (direct.name !== 'Direct' || direct.normalized_name !== 'direct' || direct.kind !== 'DIRECT') {
    throw new Error('The canonical Direct referral source is invalid');
  }
  const sources = await prisma.referralSource.findMany({
    where: { is_active: true },
    select: { id: true, name: true, kind: true, is_active: true },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  });
  return sources.map((source) => ({ id: source.id, name: source.name, kind: source.kind, isActive: source.is_active }));
}

export async function createReferralSource(input: unknown) {
  await requireAuth(['ADMIN']);
  const parsed = createReferralSourceSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid referral source');
  const name = parsed.data.name.replace(/\s+/g, ' ');
  const normalizedName = name.toLocaleLowerCase('en');
  if (!name || normalizedName === 'direct') {
    throw new Error('Provide a distinct source name and choose Referral or Sales');
  }
  const source = await prisma.referralSource.create({
    data: { name, normalized_name: normalizedName, kind: parsed.data.kind },
    select: { id: true, name: true, kind: true, is_active: true },
  });
  return { id: source.id, name: source.name, kind: source.kind, isActive: source.is_active };
}

export async function updateAccountProfileTx(
  tx: Prisma.TransactionClient,
  userId: string,
  input: UpdateAccountProfileInput,
) {
  const parsed = updateAccountProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid account details');
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user || user.role === 'ADMIN') throw new Error('Only Tutor and Student accounts can be edited here');

  const data: Prisma.UserUpdateInput = {};
  if (parsed.data.name !== undefined) data.name = normalize(parsed.data.name);
  if (parsed.data.email !== undefined) data.email = normalize(parsed.data.email)?.toLowerCase() || null;
  if (parsed.data.phone !== undefined) data.phone = normalize(parsed.data.phone);
  if (parsed.data.referralSourceId !== undefined) {
    if (user.role !== 'STUDENT') throw new Error('Referral attribution applies to Student accounts only');
    const referralSourceId = dataSourceId(parsed.data.referralSourceId);
    if (referralSourceId) {
      const source = await activeReferralSource(tx, referralSourceId);
      data.referral_source = { connect: { id: source.id } };
    } else {
      data.referral_source = { disconnect: true };
    }
  }
  if (parsed.data.tutorHourlyRateOverride !== undefined) {
    if (user.role !== 'TUTOR') throw new Error('Hourly rate override applies to Tutor accounts only');
    data.tutor_hourly_rate_override = parsed.data.tutorHourlyRateOverride === null
      ? null
      : new Prisma.Decimal(parsed.data.tutorHourlyRateOverride);
  }
  if (!Object.keys(data).length) throw new Error('No account changes were provided');

  const duplicateConditions: Prisma.UserWhereInput[] = [];
  if (typeof data.email === 'string') duplicateConditions.push({ email: data.email });
  if (typeof data.phone === 'string') duplicateConditions.push({ phone: data.phone });
  if (duplicateConditions.length) {
    const duplicate = await tx.user.findFirst({
      where: { AND: [{ id: { not: userId } }, { OR: duplicateConditions }] },
      select: { id: true },
    });
    if (duplicate) throw new Error('Another account already uses that email or phone');
  }

  return tx.user.update({
    where: { id: userId },
    data,
    select: { id: true, role: true, name: true, email: true, phone: true, referral_source_id: true, tutor_hourly_rate_override: true },
  });
}

async function issueAccountToken(tx: Prisma.TransactionClient, userId: string, purpose: AccountTokenPurpose) {
  const now = new Date();
  const ttlMinutes = purpose === 'SETUP' ? ACCOUNT_SETUP_TTL_MINUTES : ACCOUNT_PASSWORD_RESET_TTL_MINUTES;
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
  const token = newAccountToken();
  await tx.accountSetupToken.updateMany({ where: { user_id: userId, purpose, consumed_at: null }, data: { consumed_at: now } });
  await tx.accountSetupToken.create({ data: { user_id: userId, purpose, token_hash: token.hash, expires_at: expiresAt } });
  return { raw: token.raw, expiresAt };
}

export async function createAccount(input: CreateAccountInput) {
  await requireAuth(['ADMIN']);
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid account details');
  const referralSourceId = dataSourceId(parsed.data.referralSourceId);
  const data = {
    role: parsed.data.role,
    name: normalize(parsed.data.name),
    email: normalize(parsed.data.email)?.toLowerCase() || null,
    phone: normalize(parsed.data.phone),
  };

  const account = await prisma.$transaction(async (tx) => {
    const duplicateConditions: Prisma.UserWhereInput[] = [];
    if (data.email) duplicateConditions.push({ email: data.email });
    if (data.phone) duplicateConditions.push({ phone: data.phone });
    const duplicate = duplicateConditions.length > 0
      ? await tx.user.findFirst({ where: { OR: duplicateConditions }, select: { id: true } })
      : null;
    if (duplicate) throw new Error('An account already uses that email or phone');
    const referralSource = referralSourceId ? await activeReferralSource(tx, referralSourceId) : null;
    const user = await tx.user.create({
      data: {
        ...data,
        password_hash: null,
        account_status: 'PENDING_CREDENTIALS',
        referral_source_id: parsed.data.role === 'STUDENT' ? referralSource?.id ?? null : null,
      },
      select: { id: true, role: true, account_status: true, name: true, email: true, phone: true, referral_source_id: true },
    });
    const setup = await issueAccountToken(tx, user.id, 'SETUP');
    return { user, setup };
  });

  return {
    id: account.user.id,
    role: account.user.role,
    accountStatus: account.user.account_status,
    name: account.user.name,
    email: account.user.email,
    phone: account.user.phone,
    referralSourceId: account.user.referral_source_id,
    setupToken: account.setup.raw,
    setupExpiresAt: account.setup.expiresAt.toISOString(),
  };
}

export async function initiateAccountSetup(userId: string) {
  await requireAuth(['ADMIN']);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, account_status: true } });
    if (!user) throw new Error('Account not found');
    if (user.role === 'ADMIN') throw new Error('Setup links are only available for Tutor and Student accounts');
    if (user.account_status === 'ACTIVE') throw new Error('Active accounts do not need a setup link');
    return issueAccountToken(tx, user.id, 'SETUP');
  });
  return { userId, setupToken: result.raw, setupExpiresAt: result.expiresAt.toISOString() };
}

export async function initiatePasswordReset(userId: string) {
  await requireAuth(['ADMIN']);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, account_status: true } });
    if (!user || user.role === 'ADMIN' || user.account_status !== 'ACTIVE') {
      throw new Error('Password reset is only available for active Tutor and Student accounts');
    }
    return issueAccountToken(tx, user.id, 'PASSWORD_RESET');
  });
  return { userId, resetToken: result.raw, resetExpiresAt: result.expiresAt.toISOString() };
}

export async function completeAccountSetup(
  input: AccountSetupInput,
  dependencies: {
    hashPassword: (password: string) => Promise<string>;
    setSessionCookie: (payload: { userId: string; email: string; name: string; role: Role }) => Promise<void>;
  },
) {
  const parsed = accountSetupSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid setup details');
  const passwordHash = await dependencies.hashPassword(parsed.data.password);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const token = await tx.accountSetupToken.findFirst({
      where: { purpose: 'SETUP', token_hash: tokenHash(parsed.data.token), consumed_at: null, expires_at: { gt: now } },
      include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
    });
    if (!token) throw new Error('This setup link is invalid or expired');
    if (token.user.role === 'ADMIN') throw new Error('This setup link is invalid or expired');

    const profile = {
      name: normalize(parsed.data.name) || token.user.name,
      email: (normalize(parsed.data.email) || token.user.email)?.toLowerCase() || null,
      phone: normalize(parsed.data.phone) || token.user.phone,
    };
    if (!profileComplete(profile)) {
      throw new Error('Complete your name, email, and phone before finishing setup');
    }
    const completeProfile = { name: profile.name!, email: profile.email!, phone: profile.phone! };

    const duplicateConditions: Prisma.UserWhereInput[] = [];
    if (completeProfile.email) duplicateConditions.push({ email: completeProfile.email });
    if (completeProfile.phone) duplicateConditions.push({ phone: completeProfile.phone });
    if (duplicateConditions.length > 0) {
      const duplicate = await tx.user.findFirst({
        where: { AND: [{ NOT: { id: token.user.id } }, { OR: duplicateConditions }] },
        select: { id: true },
      });
      if (duplicate) throw new Error('An account already uses that email or phone');
    }

    const consumed = await tx.accountSetupToken.updateMany({
      where: { id: token.id, purpose: 'SETUP', consumed_at: null, expires_at: { gt: now } },
      data: { consumed_at: now },
    });
    if (consumed.count !== 1) throw new Error('This setup link is no longer available');

    await tx.user.update({
      where: { id: token.user.id },
      data: { ...completeProfile, password_hash: passwordHash, account_status: 'ACTIVE' },
    });

    return {
      userId: token.user.id,
      role: token.user.role,
      accountStatus: 'ACTIVE' as const,
      profileComplete: true,
      name: completeProfile.name,
      email: completeProfile.email,
    };
  });

  await dependencies.setSessionCookie({
    userId: result.userId,
    email: result.email,
    name: result.name,
    role: result.role as Role,
  });

  return result;
}

export async function completePasswordReset(
  input: PasswordResetInput,
  dependencies: { hashPassword: (password: string) => Promise<string> },
) {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid reset details');
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const token = await tx.accountSetupToken.findFirst({
      where: { purpose: 'PASSWORD_RESET', token_hash: tokenHash(parsed.data.token), consumed_at: null, expires_at: { gt: now } },
      include: { user: { select: { id: true, role: true, account_status: true } } },
    });
    if (!token || token.user.role === 'ADMIN' || token.user.account_status !== 'ACTIVE') {
      throw new Error('This password reset link is invalid or expired');
    }

    const consumed = await tx.accountSetupToken.updateMany({
      where: { id: token.id, purpose: 'PASSWORD_RESET', consumed_at: null, expires_at: { gt: now } },
      data: { consumed_at: now },
    });
    if (consumed.count !== 1) throw new Error('This password reset link is invalid or expired');

    const passwordHash = await dependencies.hashPassword(parsed.data.password);
    await tx.user.update({ where: { id: token.user.id }, data: { password_hash: passwordHash } });
    return { userId: token.user.id, role: token.user.role };
  });
}
