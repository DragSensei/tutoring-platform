'use server';

import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface PlatformPoliciesData {
  checkInWindowHours: number;
  groupSessionPrice: number;
  privateSessionPrice: number;
  allowOverdraft: boolean;
  updatedAt?: string;
}

export interface UpdatePoliciesInput {
  checkInWindowHours: number;
  groupSessionPrice: number;
  privateSessionPrice: number;
  allowOverdraft: boolean;
}

const DEFAULT_POLICIES: PlatformPoliciesData = {
  checkInWindowHours: 4,
  groupSessionPrice: 375.0,
  privateSessionPrice: 500.0,
  allowOverdraft: true,
};

export async function getPlatformPolicies(): Promise<PlatformPoliciesData> {
  try {
    const policy = await prisma.platformPolicy.findUnique({
      where: { id: 'default' },
    });

    if (!policy) {
      const created = await prisma.platformPolicy.create({
        data: {
          id: 'default',
          check_in_window_hours: DEFAULT_POLICIES.checkInWindowHours,
          group_session_price: DEFAULT_POLICIES.groupSessionPrice,
          private_session_price: DEFAULT_POLICIES.privateSessionPrice,
          allow_overdraft: DEFAULT_POLICIES.allowOverdraft,
        },
      });

      return {
        checkInWindowHours: created.check_in_window_hours,
        groupSessionPrice: Number(created.group_session_price),
        privateSessionPrice: Number(created.private_session_price),
        allowOverdraft: created.allow_overdraft,
        updatedAt: created.updated_at.toISOString(),
      };
    }

    return {
      checkInWindowHours: policy.check_in_window_hours,
      groupSessionPrice: Number(policy.group_session_price),
      privateSessionPrice: Number(policy.private_session_price),
      allowOverdraft: policy.allow_overdraft,
      updatedAt: policy.updated_at.toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch platform policies from DB, using defaults:', error);
    return DEFAULT_POLICIES;
  }
}

export async function updatePlatformPolicies(
  input: UpdatePoliciesInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const windowHours = Math.max(1, Math.min(48, Math.round(input.checkInWindowHours)));
    const groupPrice = Math.max(0, Math.round(input.groupSessionPrice * 100) / 100);
    const privatePrice = Math.max(0, Math.round(input.privateSessionPrice * 100) / 100);
    const allowOverdraft = Boolean(input.allowOverdraft);

    await prisma.platformPolicy.upsert({
      where: { id: 'default' },
      update: {
        check_in_window_hours: windowHours,
        group_session_price: groupPrice,
        private_session_price: privatePrice,
        allow_overdraft: allowOverdraft,
      },
      create: {
        id: 'default',
        check_in_window_hours: windowHours,
        group_session_price: groupPrice,
        private_session_price: privatePrice,
        allow_overdraft: allowOverdraft,
      },
    });

    revalidatePath('/admin/policies');
    revalidatePath('/admin/gadwal');
    revalidatePath('/admin');
    revalidatePath('/student/dashboard');
    revalidatePath('/tutor/agenda');

    return { success: true };
  } catch (error) {
    console.error('Failed to update platform policies:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error updating policies',
    };
  }
}
