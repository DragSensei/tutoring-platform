import { getTutorDashboardData } from '../dashboard/_components/dashboard-data';
import { TutorTimetableView } from './_components/tutor-timetable-view';

export const dynamic = 'force-dynamic';

export default async function TutorTimetablePage() {
  const data = await getTutorDashboardData();
  return <TutorTimetableView tutor={data.tutor} sessions={data.sessions} />;
}
