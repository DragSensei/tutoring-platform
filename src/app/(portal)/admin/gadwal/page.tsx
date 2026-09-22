import { getAdminWeeklySeries } from './actions';
import { AdminGadwalView } from './_components/admin-gadwal-view';

export const dynamic = 'force-dynamic';

export default async function AdminGadwalPage({ searchParams }: { searchParams: { tutorId?: string } }) {
  const tutorId = searchParams.tutorId?.trim() || undefined;
  const { series, tutorFilter } = await getAdminWeeklySeries(tutorId);

  return <AdminGadwalView series={series} tutorFilter={tutorFilter || undefined} />;
}
