import { getAdminSeriesHistory } from '../../../actions';
import { SeriesHistoryView } from './_components/series-history-view';

export const dynamic = 'force-dynamic';

export default async function SeriesHistoryPage({ params }: { params: { seriesId: string } }) {
  const series = await getAdminSeriesHistory(params.seriesId);
  return <SeriesHistoryView series={series} />;
}
