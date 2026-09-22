import { SeriesForm } from '../_components/series-form';
import { getAdminSessionFormData } from '../_components/session-form-data';

export const dynamic = 'force-dynamic';

export default async function NewAdminSessionPage() {
  const { tutors, students, policy } = await getAdminSessionFormData();
  return <SeriesForm mode="create" tutors={tutors} students={students} policy={policy} />;
}
