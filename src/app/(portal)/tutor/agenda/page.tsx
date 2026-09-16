import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/features/auth/server/session';
import { getTutorSessions, getTutorKPIs } from '@/features/sessions/server/session-actions';
import { TutorAgendaView } from './_components/tutor-agenda-view';

export const dynamic = 'force-dynamic';

export default async function TutorAgendaPage() {
  const session = await getSession();
  let tutorId = session?.userId;

  if (!tutorId || session?.role !== 'TUTOR') {
    const firstTutor = await prisma.user.findFirst({
      where: { role: 'TUTOR' },
    });
    if (!firstTutor) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-slate-800">No Tutor Account Found</h2>
          <p className="text-slate-500 mt-2">Create a tutor in the database to view agenda.</p>
        </div>
      );
    }
    tutorId = firstTutor.id;
  }

  const [sessions, kpis] = await Promise.all([
    getTutorSessions(tutorId),
    getTutorKPIs(tutorId),
  ]);

  return <TutorAgendaView sessions={sessions} kpis={kpis} />;
}
