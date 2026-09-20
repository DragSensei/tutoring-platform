import { getStudentDashboardData } from './_components/dashboard-data';
import { StudentDashboardView } from './_components/student-dashboard-view';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const { student, wallet, nextLecture, recentEvents } = await getStudentDashboardData();

  return <StudentDashboardView studentName={student.name} balance={wallet.balance} nextLecture={nextLecture} recentEvents={recentEvents} />;
}
