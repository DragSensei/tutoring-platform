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
  attributedStudents?: number;
  commissionEntries?: number;
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
    where: {},
    select: { id: true, name: true, kind: true, is_active: true, _count: { select: { students: true, commission_entries: true } } },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  });
  return sources.map((source) => ({
    id: source.id, name: source.name, kind: source.kind, isActive: source.is_active,
    attributedStudents: source._count.students,
    commissionEntries: source._count.commission_entries,
  }));
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
  return { id: source.id, name: source.name, kind: source.kind, isActive: source.is_active, attributedStudents: 0, commissionEntries: 0 };
}

export async function updateReferralSource(input: { id: string; name?: string; kind?: 'REFERRAL' | 'SALES'; isActive?: boolean }) {
  await requireAuth(['ADMIN']);
  if (!input.id || input.id === 'direct') throw new Error('The protected Direct source cannot be changed');
  return prisma.$transaction(async (tx) => {
    const current = await tx.referralSource.findUnique({ where: { id: input.id } });
    if (!current || current.kind === 'DIRECT') throw new Error('Referral source not found or protected');
    const data: Prisma.ReferralSourceUpdateInput = {};
    if (input.name !== undefined) {
      const name = input.name.trim().replace(/\s+/g, ' ');
      if (!name || name.toLocaleLowerCase('en') === 'direct') throw new Error('Choose a distinct source name');
      data.name = name;
      data.normalized_name = name.toLocaleLowerCase('en');
    }
    if (input.kind !== undefined && input.kind !== current.kind) {
      const [students, commissions] = await Promise.all([
        tx.user.count({ where: { referral_source_id: current.id } }),
        tx.commissionLedgerEntry.count({ where: { recipient_source_id: current.id } }),
      ]);
      if (students || commissions) throw new Error('Source type is fixed after student attribution or commission history exists');
      data.kind = input.kind;
    }
    if (input.isActive !== undefined) data.is_active = input.isActive;
    if (!Object.keys(data).length) throw new Error('No source changes were provided');
    const updated = await tx.referralSource.update({ where: { id: input.id }, data });
    return { id: updated.id, name: updated.name, kind: updated.kind, isActive: updated.is_active };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function setAccountActive(userId: string, active: boolean) {
  await requireAuth(['ADMIN']);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, account_status: true } });
    if (!user || user.role === 'ADMIN') throw new Error('Only Tutor and Student accounts can be deactivated');
    if (active) {
      if (user.account_status !== 'DEACTIVATED') throw new Error('This account is not deactivated');
      await tx.user.update({ where: { id: userId }, data: { account_status: 'ACTIVE' } });
      return { status: 'ACTIVE' as const, removedFutureParticipation: 0 };
    }
    if (user.account_status === 'DEACTIVATED') return { status: 'DEACTIVATED' as const, removedFutureParticipation: 0 };
    if (user.account_status !== 'ACTIVE') throw new Error('Only active accounts can be deactivated');
    const now = new Date();
    if (user.role === 'TUTOR') {
      const [sessions, series] = await Promise.all([
        tx.session.count({ where: { tutor_id: userId, start_time: { gt: now }, status: { in: ['SCHEDULED', 'ACTIVE'] } } }),
        tx.sessionSeries.count({ where: { tutor_id: userId, status: 'ACTIVE', OR: [{ ends_on: null }, { ends_on: { gte: now } }] } }),
      ]);
      if (sessions || series) throw new Error(`Cannot deactivate this Tutor yet: ${sessions} future sessions and ${series} active recurring schedules need a safe replacement Tutor first.`);
    } else {
      const [futureSessions, futureSeries] = await Promise.all([
        tx.session.findMany({ where: { OR: [{ start_time: { gt: now } }, { status: 'ACTIVE' }], status: { in: ['SCHEDULED', 'ACTIVE'] }, historical_only: false, participants: { some: { student_id: userId } } }, select: { id: true, session_type: true, status: true, attendance_saved_at: true, attendance_finalized_at: true, _count: { select: { participants: true, attendances: true, transactions: true, commission_entries: true } }, tutor_compensation: { select: { id: true } } } }),
        tx.sessionSeries.findMany({ where: { status: 'ACTIVE', OR: [{ ends_on: null }, { ends_on: { gte: now } }], participants: { some: { student_id: userId } } }, select: { id: true, session_type: true, _count: { select: { participants: true } } } }),
      ]);
      const hasSessionHistory = futureSessions.some((session) => session.status === 'ACTIVE' || session.attendance_saved_at || session.attendance_finalized_at || session._count.attendances || session._count.transactions || session._count.commission_entries || session.tutor_compensation);
      if (hasSessionHistory) throw new Error('Cannot deactivate this Student while a future or active session has saved attendance or financial history. Resolve the affected session first.');
      const invalidRosters = [...futureSessions, ...futureSeries].filter((item) => item._count.participants <= 1);
      if (invalidRosters.length) throw new Error(`Cannot deactivate this Student: removing them would leave ${invalidRosters.length} future schedule(s) without the minimum one Student. Resolve those schedules first.`);
      const [sessionsRemoved, seriesRemoved] = await Promise.all([
        tx.sessionParticipant.deleteMany({ where: { student_id: userId, session: { start_time: { gt: now }, status: 'SCHEDULED', historical_only: false } } }),
        tx.sessionSeriesParticipant.deleteMany({ where: { student_id: userId, series: { status: 'ACTIVE', OR: [{ ends_on: null }, { ends_on: { gte: now } }] } } }),
      ]);
      const count = sessionsRemoved.count + seriesRemoved.count;
      await tx.user.update({ where: { id: userId }, data: { account_status: 'DEACTIVATED' } });
      return { status: 'DEACTIVATED' as const, removedFutureParticipation: count };
    }
    await tx.user.update({ where: { id: userId }, data: { account_status: 'DEACTIVATED' } });
    return { status: 'DEACTIVATED' as const, removedFutureParticipation: 0 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function readAccountDeletionImpact(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: {
    id: true, role: true, account_status: true, referral_source_id: true,
    referral_source: { select: { name: true, kind: true } },
    _count: { select: { tutored_sessions: true, tutored_series: true, attendances: true, session_participants: true, series_participants: true, setup_tokens: true, created_transactions: true, created_student_imports: true, imported_student_rows: true, tutor_compensation_entries: true, commission_entries: true, commission_policy_updates: true, tutor_payouts: true, created_payouts: true } },
  } });
  if (!user) throw new Error('Account not found');
  const dependencies: Array<{ category: string; count: number; detail?: string }> = Object.entries(user._count).filter(([, count]) => count > 0).map(([category, count]) => ({ category, count }));
  const wallet = await tx.wallet.count({ where: { user_id: userId } });
  if (wallet) dependencies.push({ category: 'wallet and financial history', count: wallet });
  if (user.referral_source_id) dependencies.push({ category: 'current referral source', count: 1, detail: `${user.referral_source?.name ?? 'Unknown source'} · ${user.referral_source?.kind ?? 'unknown type'}` });
  return { id: user.id, role: user.role, accountStatus: user.account_status, dependencies, canDelete: user.role !== 'ADMIN' && user.account_status === 'DEACTIVATED' && dependencies.length === 0 };
}

export async function getAccountDeletionImpact(userId: string) {
  await requireAuth(['ADMIN']);
  return prisma.$transaction((tx) => readAccountDeletionImpact(tx, userId), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function permanentlyDeleteAccount(userId: string, phrase: string) {
  await requireAuth(['ADMIN']);
  if (phrase !== 'delete-this-account') throw new Error('Type the exact confirmation phrase to continue');
  return prisma.$transaction(async (tx) => {
    const impact = await readAccountDeletionImpact(tx, userId);
    if (!impact.canDelete) throw new Error('Permanent deletion is blocked because this account has related history or is not deactivated');
    await tx.user.delete({ where: { id: userId } });
    return { deleted: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateAccountProfileTx(
  tx: Prisma.TransactionClient,
  userId: string,
  input: UpdateAccountProfileInput,
) {
  const parsed = updateAccountProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid account details');
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, referral_source_id: true } });
  if (!user || user.role === 'ADMIN') throw new Error('Only Tutor and Student accounts can be edited here');

  const data: Prisma.UserUpdateInput = {};
  if (parsed.data.name !== undefined) data.name = normalize(parsed.data.name);
  if (parsed.data.email !== undefined) data.email = normalize(parsed.data.email)?.toLowerCase() || null;
  if (parsed.data.phone !== undefined) data.phone = normalize(parsed.data.phone);
  if (parsed.data.referralSourceId !== undefined) {
    if (user.role !== 'STUDENT') throw new Error('Referral attribution applies to Student accounts only');
    const referralSourceId = dataSourceId(parsed.data.referralSourceId);
    if (referralSourceId && referralSourceId !== user.referral_source_id) {
      const source = await activeReferralSource(tx, referralSourceId);
      data.referral_source = { connect: { id: source.id } };
    } else if (!referralSourceId && user.referral_source_id) {
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
    if (user.account_status === 'ACTIVE' || user.account_status === 'DEACTIVATED') throw new Error('Only accounts awaiting setup may receive a setup link');
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
      include: { user: { select: { id: true, name: true, email: true, phone: true, role: true, account_status: true } } },
    });
    if (!token) throw new Error('This setup link is invalid or expired');
    if (token.user.role === 'ADMIN' || token.user.account_status === 'DEACTIVATED') throw new Error('This setup link is invalid or expired');

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

    const activated = await tx.user.updateMany({
      where: { id: token.user.id, account_status: { in: ['PENDING_CREDENTIALS', 'PENDING_PROFILE'] } },
      data: { ...completeProfile, password_hash: passwordHash, account_status: 'ACTIVE' },
    });
    if (activated.count !== 1) throw new Error('This setup link is invalid or expired');

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
