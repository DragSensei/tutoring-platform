import { getAdminSeries } from '../../../actions';
import { getAdminSessionFormData } from '../../../_components/session-form-data';
import { SeriesForm } from '../../../_components/series-form';

export const dynamic = 'force-dynamic';

export default async function EditSeriesPage({ params }: { params: { seriesId: string } }) {
  const [{ tutors, students, policy }, series] = await Promise.all([
    getAdminSessionFormData(),
    getAdminSeries(params.seriesId),
  ]);
  return <SeriesForm mode="edit" tutors={tutors} students={students} policy={policy} initialSeries={series} />;
}
