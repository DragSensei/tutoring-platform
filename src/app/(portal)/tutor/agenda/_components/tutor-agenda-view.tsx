'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { ClosestSessionTimer } from '../../dashboard/_components/ClosestSessionTimer';
import { SessionSelectionGrid } from '../../dashboard/_components/SessionSelectionGrid';
import {
  getStoredScheduleExceptions,
  saveStoredScheduleExceptions,
} from '../../dashboard/_components/session-storage';
import { findClosestSessionDue } from '../../dashboard/_components/timer-utils';
import { SessionRescheduleDialog } from '@/features/sessions/components/session-reschedule-dialog';
import type { LocalScheduleException, WeeklyScheduleSession } from '@/features/sessions/components/weekly-session-schedule';
import type { TutorDashboardData } from '../../dashboard/_components/dashboard-data';
import {
  NeedsAttention,
  RecentSessionSummary,
  SchedulePreview,
} from './agenda-sections';

export function TutorAgendaView({ tutor, sessions: initialSessions }: TutorDashboardData) {
  const searchParams = useSearchParams();
  const allSessions = initialSessions;
  const [exceptions, setExceptions] = React.useState<Record<string, LocalScheduleException>>({});
  const [rescheduleSession, setRescheduleSession] = React.useState<WeeklyScheduleSession | null>(null);

  React.useEffect(() => {
    setExceptions(getStoredScheduleExceptions());
  }, []);

  const activeSessions = React.useMemo(
    () => allSessions
      .filter((session) => session.status !== 'COMPLETED' && session.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [allSessions]
  );
  const completedSessions = allSessions.filter((session) => session.status === 'COMPLETED');
  const closestSession = React.useMemo(
    () => findClosestSessionDue(activeSessions, new Date(), exceptions),
    [activeSessions, exceptions]
  );
  const nextSession = closestSession
    ? activeSessions.find((session) => session.id === closestSession.id) || null
    : null;
  const completedId = searchParams.get('completed');
  const completedSession = completedId
    ? allSessions.find((session) => session.id === completedId)
    : null;
  const presentCount = Number(searchParams.get('present') || 0);

  const saveException = (sessionId: string, exception: LocalScheduleException) => {
    setExceptions((current) => {
      const next = { ...current, [sessionId]: exception };
      saveStoredScheduleExceptions(next);
      return next;
    });
  };

  return (
    <div className="min-w-0 space-y-8">
      <header className="flex flex-col gap-4 border-b border-stone-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-md border border-brand-border/60 bg-brand-subtle px-2 py-1 text-xs font-semibold text-brand-primary">Faculty portal</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Agenda</h1>
          <p className="mt-1 text-sm text-stone-500">Welcome back, {tutor.name}. Prioritize the next session and anything still awaiting documentation.</p>
        </div>
        <Link href="/tutor/timetable" className="inline-flex min-h-[44px] w-fit items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50">
          Open timetable
        </Link>
      </header>

      {completedSession && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            {completedSession.title} saved with {presentCount} present.
          </p>
          <Link href="/tutor/history" className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-emerald-800 hover:text-emerald-900">View history</Link>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-8 xl:grid-cols-12">
        <div className="min-w-0 space-y-8 xl:col-span-8">
          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:p-7" aria-label="Next or current session">
            <ClosestSessionTimer
              closestSession={closestSession}
              attendanceHref={nextSession ? `/tutor/attendance/${nextSession.id}` : undefined}
              onPostpone={nextSession ? () => setRescheduleSession(nextSession) : undefined}
            />
          </section>
          <NeedsAttention sessions={activeSessions} />
          <SessionSelectionGrid sessions={activeSessions} />
        </div>

        <div className="min-w-0 space-y-6 xl:col-span-4">
          <SchedulePreview sessions={allSessions} exceptions={exceptions} />
          <RecentSessionSummary sessions={completedSessions} />
        </div>
      </div>

      <SessionRescheduleDialog
        session={rescheduleSession}
        existingException={rescheduleSession ? exceptions[rescheduleSession.id] : undefined}
        onClose={() => setRescheduleSession(null)}
        onSave={saveException}
      />
    </div>
  );
}
