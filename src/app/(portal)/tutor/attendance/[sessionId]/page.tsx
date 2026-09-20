import { getTutorDashboardData } from '../../dashboard/_components/dashboard-data';
import { AttendanceWorkspace } from './_components/attendance-workspace';

export const dynamic = 'force-dynamic';

export default async function TutorAttendancePage({
  params,
}: {
  params: { sessionId: string };
}) {
  const data = await getTutorDashboardData();
  return (
    <AttendanceWorkspace
      initialSessions={data.sessions}
      sessionId={params.sessionId}
    />
  );
}
