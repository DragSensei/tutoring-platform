import { SeriesForm } from '../_components/series-form';
import { getAdminSeriesFormData } from '../_components/session-form-data';

export const dynamic = 'force-dynamic';

export default async function NewAdminSessionPage() {
  const { tutors, students, policy, pricingProfiles } = await getAdminSeriesFormData();
  return <SeriesForm mode="create" tutors={tutors} students={students} policy={policy} pricingProfiles={pricingProfiles} />;
}
