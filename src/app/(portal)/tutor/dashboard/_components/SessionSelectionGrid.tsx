'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { formatSessionCode } from '@/shared/utils/session-code';
import type { GadwalSessionItem } from '@/features/sessions/types';

export function SessionSelectionGrid({ sessions }: { sessions: GadwalSessionItem[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-medium text-stone-600">No active or upcoming sessions.</p>
      </div>
    );
  }

  return (
    <section className="min-w-0 space-y-3" aria-labelledby="active-sessions-heading">
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="active-sessions-heading" className="text-lg font-semibold text-stone-900">Active and upcoming</h2>
          <p className="mt-1 text-sm text-stone-500">Open attendance only when the concrete session window is open.</p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-stone-500">{sessions.length} sessions</span>
      </div>
      <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
        {sessions.map((session) => {
          const sessionCode = session.sessionCode || formatSessionCode({
            title: session.title,
            startTime: session.startTime,
            endTime: session.endTime,
          });
          const studentCount = session.roster?.length || session.assignedStudents?.length || session.attendeeCount;

          return (
            <div key={session.id} className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-stone-900">{sessionCode}</span>
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-600">{session.sessionType.toLowerCase()}</span>
                </div>
                <h3 className="mt-1 truncate text-sm font-semibold text-stone-800">{session.title}</h3>
                <p className="mt-1 text-xs text-stone-500">{formatDateTime(session.startTime)} · {studentCount} student{studentCount === 1 ? '' : 's'}</p>
              </div>
              {session.attendanceWindowState === 'OPEN' && (
                <Link
                  href={`/tutor/attendance/${session.id}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Record attendance
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
