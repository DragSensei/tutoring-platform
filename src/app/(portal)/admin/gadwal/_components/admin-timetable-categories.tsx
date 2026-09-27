'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent } from '@/shared/components/card';
import { formatDateTime } from '@/shared/utils/date-format';
import type { GadwalSessionItem } from '@/features/sessions/types';
import { groupAdminTimetableSessions, type AdminTimetableCategory } from './admin-timetable-utils';

const categories: Array<{ id: AdminTimetableCategory; label: string }> = [
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'NEEDS_ATTENTION', label: 'Needs Attention' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function AdminTimetableCategories({ sessions, attentionSessionIds, asOf }: { sessions: GadwalSessionItem[]; attentionSessionIds: string[]; asOf: string }) {
  const [selected, setSelected] = React.useState<AdminTimetableCategory>('UPCOMING');
  const [now, setNow] = React.useState(() => Date.parse(asOf));
  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const groups = groupAdminTimetableSessions(sessions, new Set(attentionSessionIds), new Date(now));
  const visible = groups[selected];
  return (
    <section className="min-w-0 space-y-4" aria-label="Admin Session timetable">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Session categories">
        {categories.map(({ id, label }) => <button key={id} id={`admin-timetable-tab-${id.toLowerCase()}`} type="button" aria-pressed={selected === id} aria-controls="admin-timetable-panel" onClick={() => setSelected(id)} className={`flex min-h-[44px] min-w-0 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${selected === id ? 'border-brand-border bg-brand-subtle text-brand-primary' : 'border-border-subtle bg-canvas text-text-muted hover:text-text-primary'}`}><span className="break-words">{label}</span><span className="font-mono tabular-nums">{groups[id].length}</span></button>)}
      </div>
      <div id="admin-timetable-panel" role="region" aria-label={`${categories.find(({ id }) => id === selected)?.label} Sessions`} aria-live="polite">
        {visible.length ? <ol className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-canvas">{visible.map((session) => (
          <li key={session.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-semibold text-text-primary">{session.title}</h2><Badge variant="outline">{session.sessionType}</Badge>{session.recoveryGrant && <Badge variant="warning">Recovery Window Active</Badge>}</div>
              <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-text-muted"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />{formatDateTime(session.startTime, { includeYear: true })} → {formatDateTime(session.endTime, { includeYear: true })}</p>
              <p className="mt-1 text-sm text-text-muted">Tutor: {session.tutorName}{session.attendanceSubmittedAt ? ` · Attendance submitted ${formatDateTime(session.attendanceSubmittedAt)}` : ''}</p>
            </div>
            <Link href={`/admin/finances/sessions/${encodeURIComponent(session.id)}`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Open Session</Link>
          </li>
        ))}</ol> : <p className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-text-muted">No {categories.find(({ id }) => id === selected)?.label.toLowerCase()} Sessions.</p>}
      </div>
    </section>
  );
}
