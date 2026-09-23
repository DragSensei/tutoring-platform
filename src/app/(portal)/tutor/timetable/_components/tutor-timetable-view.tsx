'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SessionRescheduleDialog } from '@/features/sessions/components/session-reschedule-dialog';
import { WeeklySessionSchedule, type WeeklyScheduleSession } from '@/features/sessions/components/weekly-session-schedule';
import type { GadwalSessionItem } from '@/features/sessions/types';
import { postponeTutorSession } from '../actions';

interface TutorTimetableViewProps {
  tutor: { id: string; name: string };
  sessions: GadwalSessionItem[];
}

export function TutorTimetableView({ tutor, sessions: initialSessions }: TutorTimetableViewProps) {
  const router = useRouter();
  const [rescheduleSession, setRescheduleSession] = React.useState<WeeklyScheduleSession | null>(null);

  const saveException = async (sessionId: string, input: { startTime: string; endTime: string; reason: string }) => {
    await postponeTutorSession(sessionId, input);
    router.refresh();
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
        sessions={initialSessions.filter((session) => !session.historicalOnly)}
        onReschedule={setRescheduleSession}
        heading="Weekly recurring schedule"
        description="Review concrete occurrences and postpone one occurrence without changing the weekly series."
      />

      <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Postponing updates this concrete Session only. The weekly recurrence continues to materialize future occurrences normally.
      </p>

      <SessionRescheduleDialog
        session={rescheduleSession}
        onClose={() => setRescheduleSession(null)}
        onSave={saveException}
      />
    </div>
  );
}
