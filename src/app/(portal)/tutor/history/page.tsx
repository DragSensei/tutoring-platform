import { getTutorDashboardData } from '../dashboard/_components/dashboard-data';
import { TutorHistoryView } from './_components/tutor-history-view';

export const dynamic = 'force-dynamic';

export default async function TutorHistoryPage() {
  const data = await getTutorDashboardData();
  return <TutorHistoryView {...data} />;
}
