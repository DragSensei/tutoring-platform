import { getAdminSession } from '../../actions';
import { SessionForm } from '../../_components/session-form';
import { getAdminSessionFormData } from '../../_components/session-form-data';

export const dynamic = 'force-dynamic';

export default async function EditAdminSessionPage({ params }: { params: { sessionId: string } }) {
  const [session, { tutors, students, policy }] = await Promise.all([
    getAdminSession(params.sessionId),
    getAdminSessionFormData(),
  ]);
  return <SessionForm mode="edit" tutors={tutors} students={students} policy={policy} initialSession={session} />;
}
