'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/features/auth/server/session';
import { markAdminAttendanceHandled } from '@/features/attendance/server/admin-attendance';

export async function markSessionHandled(sessionId: string, note: string) {
  try {
    const admin = await requireAuth(['ADMIN']);
    await markAdminAttendanceHandled(admin.userId, sessionId, note);
    revalidatePath('/admin');
    revalidatePath('/admin/needs-attention');
    revalidatePath('/admin/gadwal');
    revalidatePath(`/admin/finances/sessions/${sessionId}`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Session could not be marked handled.' };
  }
}
