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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Admin Console
            </span>
            <span className="text-xs font-semibold text-stone-500">Timetable & Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Admin Gadwal Management (إدارة الجدول)
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Schedule private and group tutoring sessions. Check-in deadlines are strictly set to 4 hours from start time.
          </p>
        </div>
      </div>

      <ScheduleSessionCard tutors={tutors} />
      <GadwalTable sessions={sessions} />
    </div>
  );
}
