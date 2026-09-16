import { getStudentDashboardData } from './_components/dashboard-data';
import { StudentBalanceBanner } from './_components/StudentBalanceBanner';
import { UpcomingLecturesCard } from './_components/UpcomingLecturesCard';
import { RecentActivityLedger } from './_components/RecentActivityLedger';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const { student, wallet, nextLecture, recentEvents } = await getStudentDashboardData();

  return (
    <div className="min-h-screen bg-canvas">
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <StudentBalanceBanner
          studentName={student.name}
          balance={wallet.balance}
        />
        <UpcomingLecturesCard lecture={nextLecture} />
        <RecentActivityLedger
          events={recentEvents}
          currentBalance={wallet.balance}
        />
      </main>
    </div>
  );
}
