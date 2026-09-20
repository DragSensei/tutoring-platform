import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2 } from 'lucide-react';
import { formatDateTime, formatTime } from '@/shared/utils/date-format';
import { resolveEffectiveSessionTiming } from '@/shared/utils/session-timing';
import type { LocalScheduleException } from '@/features/sessions/components/weekly-session-schedule';
import type { GadwalSessionItem } from '@/features/sessions/types';

export function NeedsAttention({ sessions }: { sessions: GadwalSessionItem[] }) {
  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs" aria-labelledby="needs-attention-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="needs-attention-heading" className="text-lg font-semibold text-stone-900">Needs attention</h2>
          <p className="mt-1 text-sm text-stone-500">Finish attendance, notes, and evidence in the full workspace.</p>
        </div>
        <span className="rounded-md bg-brand-subtle px-2.5 py-1 text-sm font-semibold tabular-nums text-brand-primary">{sessions.length}</span>
      </div>
      {sessions.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Nothing requires completion.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-stone-100">
          {sessions.slice(0, 4).map((session) => (
            <Link key={session.id} href={`/tutor/attendance/${session.id}`} className="flex min-h-[56px] items-center justify-between gap-3 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-900">{session.title}</span>
                <span className="block text-xs text-stone-500">{session.sessionCode || session.sessionType}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function SchedulePreview({
  sessions,
  exceptions,
}: {
  sessions: GadwalSessionItem[];
  exceptions: Record<string, LocalScheduleException>;
}) {
  const previewSessions = [...sessions]
    .filter((session) => session.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 2);

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs" aria-labelledby="schedule-preview-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="schedule-preview-heading" className="text-base font-semibold text-stone-900">Upcoming schedule</h2>
          <p className="mt-0.5 text-xs text-stone-500">Next classes this week.</p>
        </div>
        <Link href="/tutor/timetable" className="inline-flex min-h-[44px] shrink-0 items-center px-1 text-xs font-semibold text-brand-primary hover:text-brand-hover">Full timetable</Link>
      </div>
      <div className="mt-3 divide-y divide-stone-100">
        {previewSessions.length === 0 ? (
          <p className="py-2 text-xs text-stone-500">No scheduled sessions.</p>
        ) : previewSessions.map((session) => {
          const exception = exceptions[session.id];
          const timing = resolveEffectiveSessionTiming(session.startTime, session.endTime, exception?.effectiveStartTime);
          return (
            <div key={session.id} className="flex items-start gap-2.5 py-2.5">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-stone-900">{session.title}</p>
                <p className="mt-0.5 text-[11px] text-stone-500">{formatDateTime(timing.startTime)}–{formatTime(timing.endTime)}</p>
                {exception && <p className="mt-0.5 text-[11px] font-medium text-amber-800">One-off · {exception.reason}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RecentSessionSummary({ sessions }: { sessions: GadwalSessionItem[] }) {
  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs" aria-labelledby="recent-session-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="recent-session-heading" className="text-base font-semibold text-stone-900">Recent sessions</h2>
          <p className="mt-0.5 text-xs text-stone-500">Completed attendance.</p>
        </div>
        <Link href="/tutor/history" className="inline-flex min-h-[44px] shrink-0 items-center px-1 text-xs font-semibold text-brand-primary hover:text-brand-hover">History</Link>
      </div>
      {sessions.length === 0 ? (
        <p className="mt-3 py-1 text-xs text-stone-500">No completed sessions yet.</p>
      ) : (
        <div className="mt-2 divide-y divide-stone-100">
          {sessions.slice(0, 2).map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-2 py-2 text-xs">
              <span className="min-w-0 truncate font-medium text-stone-800">{session.title}</span>
              <span className="shrink-0 tabular-nums text-stone-500">{session.attendeeCount} present</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
