'use client';

import { CalendarClock, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { formatDateTime, formatTime } from '@/shared/utils/date-format';

export interface WeeklyScheduleSession {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  tutorName?: string;
}

export interface LocalScheduleException {
  effectiveStartTime: string;
  reason: string;
}

interface WeeklySessionScheduleProps {
  sessions: WeeklyScheduleSession[];
  exceptions?: Record<string, LocalScheduleException>;
  onReschedule?: (session: WeeklyScheduleSession) => void;
  heading?: string;
  description?: string;
}

export function WeeklySessionSchedule({
  sessions,
  exceptions = {},
  onReschedule,
  heading = "This week's timetable",
  description = 'Recurring schedule with any one-off local exceptions.',
}: WeeklySessionScheduleProps) {
  const scheduled = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white shadow-xs" aria-labelledby="weekly-schedule-heading">
      <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="weekly-schedule-heading" className="text-lg font-semibold text-stone-900">{heading}</h2>
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
          <RotateCcw className="h-3.5 w-3.5" /> Recurring schedule
        </span>
      </div>

      {scheduled.length === 0 ? (
        <div className="p-8 text-center text-sm text-stone-500">No sessions are available for this schedule.</div>
      ) : (
        <div className="divide-y divide-stone-100">
          {scheduled.map((session) => {
            const exception = exceptions[session.id];
            return (
              <div key={session.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">{session.title}</span>
                    {exception && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Rescheduled</span>}
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{session.status}</span>
                  </div>
                  {session.tutorName && <p className="mt-1 text-xs text-stone-500">Tutor: {session.tutorName}</p>}
                  <p className="mt-2 flex items-start gap-2 text-sm text-stone-600">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                    <span>Recurring: <strong className="font-medium text-stone-800">{formatDateTime(session.startTime)}</strong>–{formatTime(session.endTime)}</span>
                  </p>
                  {exception && <p className="mt-1 text-sm text-amber-800">This week: <strong>{formatDateTime(exception.effectiveStartTime)}</strong> · {exception.reason}</p>}
                </div>
                {onReschedule && (
                  <Button type="button" variant="outline" className="min-h-[44px] shrink-0 px-3" onClick={() => onReschedule(session)}>
                    {exception ? 'Edit exception' : 'Postpone'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
