import { SessionForm } from '../_components/session-form';
import { getAdminSessionFormData } from '../_components/session-form-data';

export const dynamic = 'force-dynamic';

export default async function NewAdminSessionPage() {
  const { tutors, students, policy } = await getAdminSessionFormData();
  return <SessionForm mode="create" tutors={tutors} students={students} policy={policy} defaultStartTime={new Date(Date.now() + 3_600_000).toISOString().slice(0, 16)} />;
}
