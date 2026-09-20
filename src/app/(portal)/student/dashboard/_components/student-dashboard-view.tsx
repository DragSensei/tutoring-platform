import { StudentBalanceBanner } from './StudentBalanceBanner';
import { UpcomingLecturesCard, type ScheduledLecture } from './UpcomingLecturesCard';
import { RecentActivityLedger, type WalletActivityEvent } from './RecentActivityLedger';

interface StudentDashboardViewProps {
  studentName: string;
  balance: number;
  nextLecture: ScheduledLecture | null;
  recentEvents: WalletActivityEvent[];
}

export function StudentDashboardView({ studentName, balance, nextLecture, recentEvents }: StudentDashboardViewProps) {
  return (
    <div className="w-full min-w-0 space-y-8">
      <StudentBalanceBanner studentName={studentName} balance={balance} />
      <UpcomingLecturesCard lecture={nextLecture} />
      <RecentActivityLedger events={recentEvents} currentBalance={balance} />
    </div>
  );
}
