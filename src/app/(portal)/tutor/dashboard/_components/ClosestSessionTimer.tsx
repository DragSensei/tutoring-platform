'use client';

import * as React from 'react';
import { Clock, Radio, Sparkles, CheckCircle2 } from 'lucide-react';
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
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-900">No Immediate Sessions Due</h2>
            <p className="text-xs text-stone-500">
              All currently scheduled courses are completed or outside the active window. Check your full agenda for upcoming dates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { isCurrentlyActive } = closestSession;

  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isCurrentlyActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
                Active Now &bull; Check-in Window Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Closest Session Next Due
              </span>
            )}
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
              {closestSession.sessionType}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            {closestSession.title}
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            <span>Scheduled: <strong className="font-medium text-stone-700">{formatDateTime(closestSession.startTime)}</strong></span>
            <span>&bull;</span>
            <span>4h Deadline: <strong className="font-medium text-stone-700">{formatDateTime(closestSession.deadline)}</strong></span>
            <span>&bull;</span>
            <span>Students Recorded: <strong className="font-mono font-semibold text-stone-800">{closestSession.attendeeCount}</strong></span>
          </div>
        </div>

        {/* Digital Due Timer Display */}
        <div className="flex flex-col items-start gap-2 rounded-xl bg-stone-50 p-4 border border-stone-200/80 sm:items-end sm:min-w-[240px]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            {isCurrentlyActive ? 'Time Left to Check-in' : 'Starts In'}
          </span>
          <div className="flex items-baseline gap-1 font-mono text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl tabular-nums">
            <span>{countdown.formatted}</span>
          </div>
          <div className="flex items-center gap-2 pt-1 w-full sm:w-auto justify-end">
            <span className="text-[11px] text-stone-400">Token Link:</span>
            <CopyTokenButton token={closestSession.token} />
          </div>
        </div>
      </div>
    </div>
  );
}
