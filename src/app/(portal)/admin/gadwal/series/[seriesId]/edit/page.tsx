import { getAdminSeries } from '../../../actions';
import { getAdminSeriesFormData } from '../../../_components/session-form-data';
import { SeriesForm } from '../../../_components/series-form';

export const dynamic = 'force-dynamic';

export default async function EditSeriesPage({ params }: { params: { seriesId: string } }) {
  const [{ tutors, students, policy, pricingProfiles }, series] = await Promise.all([
    getAdminSeriesFormData(),
    getAdminSeries(params.seriesId),
  ]);
  return <SeriesForm mode="edit" tutors={tutors} students={students} policy={policy} pricingProfiles={pricingProfiles} initialSeries={series} />;
}
