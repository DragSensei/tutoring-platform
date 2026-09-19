import { getAdminOverviewData } from './_components/admin-overview-data';
import { AdminOverviewView } from './_components/admin-overview-view';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const data = await getAdminOverviewData();
  return <AdminOverviewView {...data} />;
}
