import { getAdminUpcomingSeriesPage, getAdminWeeklySeries } from './actions';
import { AdminGadwalView } from './_components/admin-gadwal-view';

export const dynamic = 'force-dynamic';

export default async function AdminGadwalPage({ searchParams }: { searchParams: { tutorId?: string; page?: string } }) {
  const tutorId = searchParams.tutorId?.trim() || undefined;
  const requestedPage = Number(searchParams.page) || 1;
  const { series, tutorFilter } = await getAdminWeeklySeries(tutorId);
  const upcoming = await getAdminUpcomingSeriesPage(tutorId, requestedPage);
  return <AdminGadwalView series={series} upcoming={upcoming} tutorFilter={tutorFilter || undefined} />;
}
