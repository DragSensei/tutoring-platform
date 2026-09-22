'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { type ClosestSessionDue } from './timer-utils';
import { computeSessionCountdown, type SessionCountdown } from '@/shared/utils/session-timing';
import { Button } from '@/shared/components/button';

interface ClosestSessionTimerProps {
  closestSession: ClosestSessionDue | null;
  attendanceHref?: string;
  onPostpone?: () => void;
}

export function ClosestSessionTimer({ closestSession, attendanceHref, onPostpone }: ClosestSessionTimerProps) {
  const [countdown, setCountdown] = React.useState<SessionCountdown>(() =>
    closestSession
      ? computeSessionCountdown(closestSession.targetTimestamp)
      : { isPast: true, totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00:00' }
  );

  React.useEffect(() => {
    if (!closestSession) return;

    setCountdown(computeSessionCountdown(closestSession.targetTimestamp));

    const timer = setInterval(() => {
      setCountdown(computeSessionCountdown(closestSession.targetTimestamp));
    }, 1000);

    return () => clearInterval(timer);
  }, [closestSession]);

  if (!closestSession) {
    return (
      <div className="w-full max-w-lg mx-auto rounded-xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-stone-900">No Upcoming Sessions</h2>
          <p className="text-xs text-stone-500 max-w-sm">
            There are no future or in-progress sessions in your current schedule.
          </p>
        </div>
      </div>
    );
  }

  const { isCurrentlyActive } = closestSession;
  const sessionCode = closestSession.sessionCode || 'ON-SESSION';
  const countdownUnits = [
    { label: 'Days', value: countdown.days },
    { label: 'Hours', value: countdown.hours },
    { label: 'Minutes', value: countdown.minutes },
    { label: 'Seconds', value: countdown.seconds },
  ];

  return (
    <div className={`w-full max-w-2xl mx-auto flex flex-col items-center justify-center rounded-2xl border p-5 text-center sm:p-7 ${isCurrentlyActive ? 'border-emerald-200 bg-emerald-50/60' : 'border-transparent'}`}>
      {/* Top Due Status & Name of Nearest Due Session */}
      <div className="space-y-1.5 flex flex-col items-center">
        <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isCurrentlyActive ? 'bg-emerald-500' : 'bg-stone-400'
              }`}
            />
            <span className={isCurrentlyActive ? 'font-bold uppercase tracking-wide text-emerald-700' : 'text-stone-600'}>
              {isCurrentlyActive ? 'LIVE NOW' : 'Next session in'}
            </span>
          </span>
          <span className="text-stone-300">&bull;</span>
          <span className="text-stone-500 capitalize">
            {closestSession.sessionType.toLowerCase()} cohort
          </span>
        </div>

        {/* Session Code Name */}
        <h2 className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-stone-900 pt-1">
          {sessionCode}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 max-w-md">
          {closestSession.title}
        </p>
        <p className="text-xs text-stone-500 tabular-nums">{closestSession.assignedStudents?.length || closestSession.attendeeCount} student{(closestSession.assignedStudents?.length || closestSession.attendeeCount) === 1 ? '' : 's'} in this cohort</p>
        {closestSession.isRescheduled && (
          <span className="inline-flex max-w-md items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
            Rescheduled occurrence{closestSession.rescheduleReason ? ` · ${closestSession.rescheduleReason}` : ''}
          </span>
        )}
      </div>

      {/* Timer Display: Each unit (days, hours, minutes, seconds) in its own small box */}
      <div suppressHydrationWarning className="mt-5 flex max-w-full items-center justify-center gap-1.5 sm:gap-3.5">
        {countdownUnits.map(({ label, value }, index) => (
          <React.Fragment key={label}>
            {index > 0 && <span className="shrink-0 pb-5 text-lg font-bold text-brand-border sm:text-2xl">:</span>}
            <div className="flex shrink-0 flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-brand-border/80 bg-white shadow-xs transition-all hover:scale-105 hover:border-brand-primary sm:h-20 sm:w-20">
                <span suppressHydrationWarning className="font-mono text-xl font-extrabold tabular-nums text-brand-primary sm:text-3xl">
                  {value.toString().padStart(2, '0')}
                </span>
              </div>
              <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-stone-400 sm:text-[11px]">{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Effective concrete occurrence timing */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
        <span>{closestSession.isRescheduled ? 'This week:' : 'Scheduled:'} <strong className="font-medium text-stone-700">{formatDateTime(closestSession.startTime)}</strong></span>
        {closestSession.isRescheduled && (
          <span>Recurring: <strong className="font-medium text-stone-700">{formatDateTime(closestSession.baseStartTime)}</strong></span>
        )}
      </div>
      {(attendanceHref || onPostpone) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {attendanceHref && (
            <Link href={attendanceHref} className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
              {isCurrentlyActive ? 'Open Attendance' : 'Record attendance'}
            </Link>
          )}
          {onPostpone && <Button type="button" variant="outline" className="min-h-[44px]" onClick={onPostpone}>Postpone occurrence</Button>}
        </div>
      )}
    </div>
  );
}
