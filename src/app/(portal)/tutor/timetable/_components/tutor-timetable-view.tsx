'use client';

import * as React from 'react';
import Link from 'next/link';
import { SessionRescheduleDialog } from '@/features/sessions/components/session-reschedule-dialog';
import {
  WeeklySessionSchedule,
  type LocalScheduleException,
  type WeeklyScheduleSession,
} from '@/features/sessions/components/weekly-session-schedule';
import type { GadwalSessionItem } from '@/features/sessions/types';
import {
  getStoredScheduleExceptions,
  getStoredSessions,
  saveStoredScheduleExceptions,
} from '../../dashboard/_components/session-storage';

interface TutorTimetableViewProps {
  tutor: { id: string; name: string };
  sessions: GadwalSessionItem[];
}

export function TutorTimetableView({ tutor, sessions: initialSessions }: TutorTimetableViewProps) {
  const [sessions, setSessions] = React.useState(initialSessions);
  const [exceptions, setExceptions] = React.useState<Record<string, LocalScheduleException>>({});
  const [rescheduleSession, setRescheduleSession] = React.useState<WeeklyScheduleSession | null>(null);

  React.useEffect(() => {
    setSessions(getStoredSessions(initialSessions));
    setExceptions(getStoredScheduleExceptions());
  }, [initialSessions]);

  const saveException = (sessionId: string, exception: LocalScheduleException) => {
    setExceptions((current) => {
      const next = { ...current, [sessionId]: exception };
      saveStoredScheduleExceptions(next);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-stone-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-md border border-brand-border/60 bg-brand-subtle px-2 py-1 text-xs font-semibold text-brand-primary">Faculty portal</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Timetable</h1>
          <p className="mt-1 text-sm text-stone-500">{tutor.name}&apos;s recurring schedule and one-occurrence changes.</p>
        </div>
        <Link href="/tutor/agenda" className="inline-flex min-h-[44px] w-fit items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50">
          Back to agenda
        </Link>
      </header>

      <WeeklySessionSchedule
        sessions={sessions}
        exceptions={exceptions}
        onReschedule={setRescheduleSession}
        heading="Weekly recurring schedule"
        description="Review scheduled times and apply a local exception to one occurrence without changing the recurring series."
      />

      <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        One-occurrence changes are stored in this browser for demonstration only. Backend recurrence remains unchanged.
      </p>

      <SessionRescheduleDialog
        session={rescheduleSession}
        existingException={rescheduleSession ? exceptions[rescheduleSession.id] : undefined}
        onClose={() => setRescheduleSession(null)}
        onSave={saveException}
      />
    </div>
  );
}
