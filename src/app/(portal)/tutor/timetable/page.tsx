import { requireAuth } from '@/features/auth/server/session';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { getTutorSessions } from '@/features/sessions/server/session-actions';
import { TutorTimetableView } from './_components/tutor-timetable-view';

export const dynamic = 'force-dynamic';

export default async function TutorTimetablePage() {
  const auth = await requireAuth(['TUTOR']);
  const sessions = await getTutorSessions(auth.userId, await getPlatformPolicies(), new Date(), { mode: 'timetable', horizonDays: null });
  return <TutorTimetableView tutor={{ id: auth.userId, name: auth.name }} sessions={sessions} />;
}
