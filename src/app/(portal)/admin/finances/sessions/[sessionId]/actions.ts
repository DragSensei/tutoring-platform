'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/features/auth/server/session';
import { grantLateAttendanceRecovery } from '@/features/attendance/server/admin-attendance';

export async function grantAdminAttendanceRecovery(sessionId: string, reason: string) {
  try {
    const admin = await requireAuth(['ADMIN']);
    const grant = await grantLateAttendanceRecovery(admin.userId, sessionId, reason);
    revalidatePath('/admin');
    revalidatePath('/admin/needs-attention');
    revalidatePath('/admin/gadwal');
    revalidatePath(`/admin/finances/sessions/${sessionId}`);
    revalidatePath('/tutor/agenda');
    revalidatePath('/tutor/timetable');
    revalidatePath(`/tutor/attendance/${sessionId}`);
    return { success: true as const, closesAt: grant.closes_at.toISOString(), durationHours: grant.policy_duration_hours };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Recovery window could not be granted.' };
  }
}
