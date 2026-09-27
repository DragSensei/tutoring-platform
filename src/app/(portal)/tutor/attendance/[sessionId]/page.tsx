import { requireAuth } from '@/features/auth/server/session';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { getTutorSessions } from '@/features/sessions/server/session-actions';
import { AttendanceWorkspace } from './_components/attendance-workspace';

export const dynamic = 'force-dynamic';

export default async function TutorAttendancePage({
  params,
}: {
  params: { sessionId: string };
}) {
  const auth = await requireAuth(['TUTOR']);
  const sessions = await getTutorSessions(auth.userId, await getPlatformPolicies(), new Date(), { mode: 'single', sessionId: params.sessionId });
  return (
    <AttendanceWorkspace
      initialSessions={sessions}
      sessionId={params.sessionId}
    />
  );
}
