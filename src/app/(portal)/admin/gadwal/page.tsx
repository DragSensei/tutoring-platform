import { getGadwalSessions } from '@/features/sessions/server/session-actions';
import { prisma } from '@/shared/lib/prisma';
import { GadwalTable } from '@/features/sessions/components/gadwal-table';
import { ScheduleSessionCard } from './_components/schedule-session-card';

export const dynamic = 'force-dynamic';

export default async function AdminGadwalPage() {
  const sessions = await getGadwalSessions();
  const tutors = await prisma.user.findMany({
    where: { role: 'TUTOR' },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Admin Gadwal Management (إدارة الجدول)
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Schedule private and group tutoring sessions. Check-in deadlines are strictly set to 4 hours from start time.
        </p>
      </div>

      <ScheduleSessionCard tutors={tutors} />
      <GadwalTable sessions={sessions} />
    </div>
  );
}
