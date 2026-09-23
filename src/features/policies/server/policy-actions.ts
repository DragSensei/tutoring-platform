'use server';

import { Prisma, type CommissionBasis } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '@/shared/server/session';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface PlatformPoliciesData {
  checkInWindowHours: number;
  groupSessionPrice: number;
  privateSessionPrice: number;
  allowOverdraft: boolean;
  defaultTutorHourlyRate: string;
  commissionEnabled: boolean;
  commissionRateBps: number;
  commissionBasis: CommissionBasis;
  commissionRuleVersion: number;
  commissionUpdatedBy: string | null;
  commissionUpdatedAt?: string;
  updatedAt?: string;
}

export interface UpdatePoliciesInput {
  checkInWindowHours: number;
  groupSessionPrice: string;
  privateSessionPrice: string;
  allowOverdraft: boolean;
  defaultTutorHourlyRate: string;
  commissionEnabled: boolean;
  commissionRateBps: number;
  commissionBasis: CommissionBasis;
}

export interface PricingProfileInput {
  name: string;
  privateSessionPrice: string;
  groupSessionPrice: string;
}

const safeMoney = z.string().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/);
const updatePoliciesSchema = z.object({
  checkInWindowHours: z.number().int().min(1).max(48),
  groupSessionPrice: safeMoney,
  privateSessionPrice: safeMoney,
  allowOverdraft: z.boolean(),
  defaultTutorHourlyRate: safeMoney,
  commissionEnabled: z.boolean(),
  commissionRateBps: z.number().int().min(0).max(10_000),
  commissionBasis: z.literal('FINALIZED_SESSION_WALLET_CHARGE'),
});
const pricingProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  privateSessionPrice: safeMoney,
  groupSessionPrice: safeMoney,
});

const DEFAULT_POLICIES: PlatformPoliciesData = {
  checkInWindowHours: 4,
  groupSessionPrice: 375,
  privateSessionPrice: 500,
  allowOverdraft: true,
  defaultTutorHourlyRate: '0.00',
  commissionEnabled: false,
  commissionRateBps: 0,
  commissionBasis: 'FINALIZED_SESSION_WALLET_CHARGE',
  commissionRuleVersion: 1,
  commissionUpdatedBy: null,
};

function decimalMoney(value: string, field: string): Prisma.Decimal {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new Error(`${field} must be a non-negative amount with up to two decimal places`);
  }
  return new Prisma.Decimal(value.trim());
}

function mapPolicy(policy: {
  check_in_window_hours: number;
  group_session_price: Prisma.Decimal;
  private_session_price: Prisma.Decimal;
  allow_overdraft: boolean;
  default_tutor_hourly_rate: Prisma.Decimal;
  commission_enabled: boolean;
  commission_basis: CommissionBasis;
  commission_rate_bps: number;
  commission_rule_version: number;
  commission_updated_at: Date | null;
  commission_updated_by?: { name: string | null } | null;
  updated_at: Date;
}): PlatformPoliciesData {
  return {
    checkInWindowHours: policy.check_in_window_hours,
    groupSessionPrice: Number(policy.group_session_price),
    privateSessionPrice: Number(policy.private_session_price),
    allowOverdraft: policy.allow_overdraft,
    defaultTutorHourlyRate: policy.default_tutor_hourly_rate.toFixed(2),
    commissionEnabled: policy.commission_enabled,
    commissionRateBps: policy.commission_rate_bps,
    commissionBasis: policy.commission_basis,
    commissionRuleVersion: policy.commission_rule_version,
    commissionUpdatedBy: policy.commission_updated_by?.name ?? null,
    commissionUpdatedAt: policy.commission_updated_at?.toISOString(),
    updatedAt: policy.updated_at.toISOString(),
  };
}

export async function getPlatformPolicies(): Promise<PlatformPoliciesData> {
  try {
    const policy = await prisma.platformPolicy.findUnique({
      where: { id: 'default' },
      include: { commission_updated_by: { select: { name: true } } },
    });
    if (policy) return mapPolicy(policy);

    const created = await prisma.platformPolicy.create({
      data: {
        id: 'default',
        check_in_window_hours: DEFAULT_POLICIES.checkInWindowHours,
        group_session_price: new Prisma.Decimal(DEFAULT_POLICIES.groupSessionPrice),
        private_session_price: new Prisma.Decimal(DEFAULT_POLICIES.privateSessionPrice),
        allow_overdraft: DEFAULT_POLICIES.allowOverdraft,
        default_tutor_hourly_rate: new Prisma.Decimal(DEFAULT_POLICIES.defaultTutorHourlyRate),
        commission_enabled: DEFAULT_POLICIES.commissionEnabled,
        commission_rate_bps: DEFAULT_POLICIES.commissionRateBps,
      },
      include: { commission_updated_by: { select: { name: true } } },
    });
    return mapPolicy(created);
  } catch (error) {
    console.error('Failed to fetch platform policies:', error);
    return DEFAULT_POLICIES;
  }
}

export async function updatePlatformPolicies(input: unknown): Promise<{ success: boolean; message?: string }> {
  try {
    const auth = await requireAuth(['ADMIN']);
    const parsed = updatePoliciesSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid policy settings');
    const values = parsed.data;
    if (values.commissionEnabled && values.commissionRateBps === 0) {
      throw new Error('Set a commission rate before enabling commission');
    }

    const groupPrice = decimalMoney(values.groupSessionPrice, 'Group session price');
    const privatePrice = decimalMoney(values.privateSessionPrice, 'Private session price');
    const tutorRate = decimalMoney(values.defaultTutorHourlyRate, 'Default tutor hourly rate');
    await prisma.$transaction(async (tx) => {
      const current = await tx.platformPolicy.findUnique({ where: { id: 'default' } });
      const ruleChanged = !current || current.commission_enabled !== values.commissionEnabled ||
        current.commission_basis !== values.commissionBasis || current.commission_rate_bps !== values.commissionRateBps;
      const data = {
        check_in_window_hours: values.checkInWindowHours,
        group_session_price: groupPrice,
        private_session_price: privatePrice,
        allow_overdraft: values.allowOverdraft,
        default_tutor_hourly_rate: tutorRate,
        commission_enabled: values.commissionEnabled,
        commission_basis: values.commissionBasis,
        commission_rate_bps: values.commissionRateBps,
        ...(ruleChanged ? { commission_rule_version: (current?.commission_rule_version ?? 0) + 1 } : {}),
        ...(ruleChanged ? { commission_updated_by_user_id: auth.userId, commission_updated_at: new Date() } : {}),
      };
      await tx.platformPolicy.upsert({
        where: { id: 'default' },
        update: data,
        create: { id: 'default', ...data, commission_rule_version: 1 },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    for (const path of ['/admin/policies', '/admin/gadwal', '/admin/finances', '/admin', '/student/dashboard', '/tutor/agenda']) {
      revalidatePath(path);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to update platform policies:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error updating policies' };
  }
}

export async function getActivePricingProfiles() {
  await requireAuth(['ADMIN']);
  const profiles = await prisma.pricingProfile.findMany({
    where: { is_active: true },
    select: { id: true, name: true, private_session_price: true, group_session_price: true },
    orderBy: { name: 'asc' },
  });
  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    privateSessionPrice: profile.private_session_price.toFixed(2),
    groupSessionPrice: profile.group_session_price.toFixed(2),
  }));
}

export async function getPricingProfiles() {
  await requireAuth(['ADMIN']);
  const profiles = await prisma.pricingProfile.findMany({
    orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, private_session_price: true, group_session_price: true, is_active: true },
  });
  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    privateSessionPrice: profile.private_session_price.toFixed(2),
    groupSessionPrice: profile.group_session_price.toFixed(2),
    isActive: profile.is_active,
  }));
}

export async function savePricingProfile(id: unknown, input: unknown) {
  await requireAuth(['ADMIN']);
  if (id !== null && (typeof id !== 'string' || !id.trim())) throw new Error('Invalid Pricing Profile id');
  const parsed = pricingProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid Pricing Profile');
  const privatePrice = decimalMoney(parsed.data.privateSessionPrice, 'Private session price');
  const groupPrice = decimalMoney(parsed.data.groupSessionPrice, 'Group session price');
  const profile = typeof id === 'string'
    ? await prisma.pricingProfile.update({
      where: { id },
      data: { name: parsed.data.name, private_session_price: privatePrice, group_session_price: groupPrice },
      select: { id: true, name: true },
    })
    : await prisma.pricingProfile.create({
      data: { name: parsed.data.name, private_session_price: privatePrice, group_session_price: groupPrice },
      select: { id: true, name: true },
    });
  revalidatePath('/admin/policies');
  revalidatePath('/admin/gadwal');
  return profile;
}
