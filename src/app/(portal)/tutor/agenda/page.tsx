import { getTutorDashboardData } from '../dashboard/_components/dashboard-data';
import { TutorAgendaView } from './_components/tutor-agenda-view';

export const dynamic = 'force-dynamic';

export default async function TutorAgendaPage() {
  const data = await getTutorDashboardData();
  return <TutorAgendaView {...data} />;
}
