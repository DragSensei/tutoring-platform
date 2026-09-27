import { requireAuth } from '@/shared/server/session';
import { getAdminAttendanceInterventionBoard } from '@/features/attendance/server/admin-attendance';
import { AdminNeedsAttentionView } from './_components/admin-needs-attention-view';

export const dynamic = 'force-dynamic';

export default async function AdminNeedsAttentionPage() {
  await requireAuth(['ADMIN']);
  const asOf = new Date();
  const board = await getAdminAttendanceInterventionBoard(asOf);
  return <AdminNeedsAttentionView board={board} asOf={asOf.toISOString()} />;
}
