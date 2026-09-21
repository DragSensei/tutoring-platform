'use client';

import * as React from 'react';
import { CheckCircle2, Clock3, X } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { formatEGP } from '@/shared/utils/currency';

export interface SessionRecapData {
  title: string;
  sessionType: 'PRIVATE' | 'GROUP';
  price: number;
  tutorName: string;
  assignedStudents?: string[];
  startTime: string;
  endTime: string;
  operation: 'created' | 'updated';
}

interface SessionRecapProps {
  recap: SessionRecapData;
  onDismiss: () => void;
  onViewSchedule: () => void;
}

export function SessionRecap({ recap, onDismiss, onViewSchedule }: SessionRecapProps) {
  const [remainingSeconds, setRemainingSeconds] = React.useState(6);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingSeconds((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    const timeout = window.setTimeout(onViewSchedule, 6000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [onViewSchedule]);

  const durationMinutes = Math.max(1, Math.round((new Date(recap.endTime).getTime() - new Date(recap.startTime).getTime()) / 60_000));
  const durationLabel = durationMinutes % 60 === 0
    ? `${durationMinutes / 60} hour${durationMinutes === 60 ? '' : 's'}`
    : `${durationMinutes} minutes`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4" role="dialog" aria-modal="true" aria-labelledby="session-recap-title">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Session {recap.operation}</p>
              <h2 id="session-recap-title" className="mt-1 text-lg font-semibold text-stone-900">{recap.title}</h2>
            </div>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Dismiss session recap" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-5 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <RecapItem label="Type" value={`${recap.sessionType} · ${formatEGP(recap.price)}`} />
            <RecapItem label="Tutor" value={recap.tutorName} />
            <RecapItem label="Students" value={recap.assignedStudents?.join(', ') || 'No students'} />
            <RecapItem label="Duration" value={durationLabel} />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-stone-700">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
            <span>{formatDateTime(recap.startTime)} – {formatDateTime(recap.endTime)}</span>
          </div>
        </div>

        <div className="border-t border-stone-100 px-5 pb-5 pt-3">
          <div className="mb-3 flex items-center justify-between text-xs text-stone-500">
            <span>Returning to schedule in {remainingSeconds}s</span>
            <button type="button" onClick={onDismiss} className="min-h-[44px] px-1 font-semibold text-brand-primary hover:text-brand-hover">Keep editing</button>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
            <div className="h-full rounded-full bg-brand-primary transition-[width] duration-1000 linear" style={{ width: `${(remainingSeconds / 6) * 100}%` }} />
          </div>
          <button type="button" onClick={onViewSchedule} className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
            View schedule
          </button>
        </div>
      </div>
    </div>
  );
}

function RecapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-0.5 break-words font-medium text-stone-800">{value}</p>
    </div>
  );
}
