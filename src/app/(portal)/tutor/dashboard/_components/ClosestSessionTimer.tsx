'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { CopyTokenButton } from '@/features/sessions/components/copy-token-button';
import { computeDueCountdown, ClosestSessionDue, DueCountdown } from './timer-utils';

interface ClosestSessionTimerProps {
  closestSession: ClosestSessionDue | null;
}

export function ClosestSessionTimer({ closestSession }: ClosestSessionTimerProps) {
  const [countdown, setCountdown] = React.useState<DueCountdown>(() =>
    closestSession
      ? computeDueCountdown(closestSession.targetTimestamp)
      : { isPast: true, totalMs: 0, hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00' }
  );

  React.useEffect(() => {
    if (!closestSession) return;

    const timer = setInterval(() => {
      setCountdown(computeDueCountdown(closestSession.targetTimestamp));
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
          <h2 className="text-base font-semibold text-stone-900">No Immediate Sessions Due</h2>
          <p className="text-xs text-stone-500 max-w-sm">
            All scheduled courses are completed or outside the active window. Check the timetable agenda for future cohorts.
          </p>
        </div>
      </div>
    );
  }

  const { isCurrentlyActive } = closestSession;
  const sessionCode = closestSession.sessionCode || 'ON-SESSION';

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
      {/* Top Due Status & Name of Nearest Due Session */}
      <div className="space-y-1.5 flex flex-col items-center">
        <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isCurrentlyActive ? 'bg-emerald-500' : 'bg-stone-400'
              }`}
            />
            <span className={isCurrentlyActive ? 'text-emerald-700 font-semibold' : 'text-stone-600'}>
              {isCurrentlyActive ? 'Session in progress' : 'Next upcoming session'}
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
      </div>

      {/* Timer Display: Each unit (hours, minutes, seconds) in its own small box */}
      <div suppressHydrationWarning className="flex items-center justify-center gap-2 sm:gap-3.5 mt-5">
        {/* Hours Box */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border-2 border-brand-border/80 hover:border-brand-primary shadow-xs flex items-center justify-center transition-all hover:scale-105">
            <span
              suppressHydrationWarning
              className="font-mono text-2xl sm:text-3xl font-extrabold text-brand-primary tabular-nums"
            >
              {countdown.hours.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="mt-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Hours
          </span>
        </div>

        {/* Separator */}
        <span className="text-xl sm:text-2xl font-bold text-brand-border pb-5">:</span>

        {/* Minutes Box */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border-2 border-brand-border/80 hover:border-brand-primary shadow-xs flex items-center justify-center transition-all hover:scale-105">
            <span
              suppressHydrationWarning
              className="font-mono text-2xl sm:text-3xl font-extrabold text-brand-primary tabular-nums"
            >
              {countdown.minutes.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="mt-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Minutes
          </span>
        </div>

        {/* Separator */}
        <span className="text-xl sm:text-2xl font-bold text-brand-border pb-5">:</span>

        {/* Seconds Box */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border-2 border-brand-border/80 hover:border-brand-primary shadow-xs flex items-center justify-center transition-all hover:scale-105">
            <span
              suppressHydrationWarning
              className="font-mono text-2xl sm:text-3xl font-extrabold text-brand-primary tabular-nums"
            >
              {countdown.seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="mt-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Seconds
          </span>
        </div>
      </div>

      {/* Timing and Share Action Below Timer Boxes */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500">
        <span>Scheduled: <strong className="font-medium text-stone-700">{formatDateTime(closestSession.startTime)}</strong></span>
        <span className="text-stone-300">&bull;</span>
        <CopyTokenButton token={closestSession.token} />
      </div>
    </div>
  );
}
