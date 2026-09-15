import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/features/auth/server/session';
import { getTutorSessions, getTutorKPIs } from '@/features/sessions/server/session-actions';
import { TutorKPICard } from '@/features/sessions/components/tutor-kpi-card';
import { GadwalTable } from '@/features/sessions/components/gadwal-table';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TutorAgendaPage() {
  const session = await getSession();

  let tutorId = session?.userId;

  // If no logged in tutor session, fallback to first tutor found in DB for preview
  if (!tutorId || session?.role !== 'TUTOR') {
    const firstTutor = await prisma.user.findFirst({
      where: { role: 'TUTOR' },
    });
    if (!firstTutor) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-slate-800">No Tutor Account Found</h2>
          <p className="text-slate-500 mt-2">
            Create a tutor in the database to view agenda and KPIs.
          </p>
        </div>
      );
    }
    tutorId = firstTutor.id;
  }

  const [sessions, kpis] = await Promise.all([
    getTutorSessions(tutorId),
    getTutorKPIs(tutorId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
          Tutor Abstraction Portal
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome back, {kpis.tutorName}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Zero manual roster duties. Simply share your session token links with students.
        </p>
      </div>

      <TutorKPICard kpis={kpis} />

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Session Agenda</h2>
        <GadwalTable sessions={sessions} showTutorColumn={false} />
      </div>
    </div>
  );
}
