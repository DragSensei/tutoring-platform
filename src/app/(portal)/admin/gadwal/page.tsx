import { getGadwalSessions } from '@/features/sessions/server/session-actions';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { AdminGadwalView } from './_components/admin-gadwal-view';

export const dynamic = 'force-dynamic';

export default async function AdminGadwalPage() {
  const sessions = await getGadwalSessions(undefined, await getPlatformPolicies());

  return <AdminGadwalView sessions={sessions} />;
}
