import { getTutorDashboardData } from './_components/dashboard-data';
import { DashboardHeader } from './_components/DashboardHeader';
import { ClosestSessionTimer } from './_components/ClosestSessionTimer';
import { SessionSelectionGrid } from './_components/SessionSelectionGrid';

export const dynamic = 'force-dynamic';

export default async function TutorDashboardPage() {
  const { tutor, closestSession, sessions } = await getTutorDashboardData();

  return (
    <div className="min-h-screen bg-canvas">
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <DashboardHeader tutorName={tutor.name} />
        <ClosestSessionTimer closestSession={closestSession} />
        <SessionSelectionGrid sessions={sessions} />
      </main>
    </div>
  );
}
