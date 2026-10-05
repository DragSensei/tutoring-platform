'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { TablePagination } from '@/shared/components/table-pagination';
import type { GadwalSessionItem } from '@/features/sessions/types';
import type { WeeklySeriesItem } from '@/features/sessions/components/series-table';
import { getAdminTimetableSessions, getAdminUpcomingSeriesPage } from '../actions';
import { formatDateTime } from '@/shared/utils/date-format';
import { groupAdminTimetableSessions, type AdminTimetableCategory } from './admin-timetable-utils';

type UpcomingPage = {
  items: WeeklySeriesItem[];
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

const categories: Array<{ id: AdminTimetableCategory; label: string }> = [
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'NEEDS_ATTENTION', label: 'Needs Attention' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatClock(minute: number) {
  const hour = Math.floor(minute / 60);
  return `${hour % 12 || 12}:${String(minute % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function AdminTimetableCategories({ upcoming, tutorId }: { upcoming: UpcomingPage; tutorId?: string }) {
  const [selected, setSelected] = React.useState<AdminTimetableCategory>('UPCOMING');
  const [upcomingPage, setUpcomingPage] = React.useState(upcoming);
  const [occurrenceData, setOccurrenceData] = React.useState<{ sessions: GadwalSessionItem[]; attentionSessionIds: string[]; asOf: string } | null>(null);
  const [now, setNow] = React.useState(Date.now);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  async function changePage(page: number) {
    setLoading(true);
    setError(null);
    try {
      setUpcomingPage(await getAdminUpcomingSeriesPage(tutorId, page));
    } catch {
      setError('Unable to load this page of schedule groups. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function selectCategory(category: AdminTimetableCategory) {
    setSelected(category);
    if (category === 'UPCOMING' || occurrenceData || loading) return;
    setLoading(true);
    setError(null);
    try {
      setOccurrenceData(await getAdminTimetableSessions(tutorId));
    } catch {
      setError('Unable to load occurrence details. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const occurrenceGroups = occurrenceData
    ? groupAdminTimetableSessions(occurrenceData.sessions, new Set(occurrenceData.attentionSessionIds), new Date(now))
    : null;
  const countFor = (id: AdminTimetableCategory) => id === 'UPCOMING' ? upcomingPage.totalCount : occurrenceGroups?.[id].length ?? '—';

  return (
    <section className="min-w-0 space-y-4" aria-label="Admin Session timetable">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Session categories">
        {categories.map(({ id, label }) => <button key={id} id={`admin-timetable-tab-${id.toLowerCase()}`} type="button" aria-pressed={selected === id} aria-controls="admin-timetable-panel" onClick={() => void selectCategory(id)} className={`flex min-h-[44px] min-w-0 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${selected === id ? 'border-brand-border bg-brand-subtle text-brand-primary' : 'border-border-subtle bg-canvas text-text-muted hover:text-text-primary'}`}><span className="break-words">{label}</span><span className="font-mono tabular-nums">{countFor(id)}</span></button>)}
      </div>
      <div id="admin-timetable-panel" role="region" aria-label={`${categories.find(({ id }) => id === selected)?.label} schedule`} aria-live="polite">
        {error && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {selected === 'UPCOMING' ? <>
          {upcomingPage.items.length ? <ol className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-canvas">{upcomingPage.items.map((group) => {
            const slots = group.weeklySlots?.length ? group.weeklySlots : [group];
            return <li key={group.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-semibold text-text-primary">{group.title}</h2><Badge variant="outline">{group.sessionType}</Badge>{slots.length > 1 && <Badge variant="secondary">Intensive · {slots.length} weekly slots</Badge>}</div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />{slots.map((slot) => `${WEEKDAYS[slot.weekday]} ${formatClock(slot.startMinute)}–${formatClock(slot.startMinute + slot.durationMinutes)}`).join(' · ')}</p>
                <p className="mt-1 text-sm text-text-muted">Tutor: {group.tutorName}{group.assignedStudents.length ? ` · Students: ${group.assignedStudents.join(', ')}` : ''}</p>
                {group.nextOccurrence && <p className="mt-1 text-xs text-text-muted">Next session: {formatDateTime(group.nextOccurrence.startTime, { includeYear: true })}</p>}
              </div>
              <Link href={`/admin/gadwal/series/${encodeURIComponent(group.id)}/edit`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Manage group</Link>
            </li>;
          })}</ol> : <p className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-text-muted">No upcoming schedule groups.</p>}
          <TablePagination itemCount={upcomingPage.totalCount} page={upcomingPage.page} pageCount={upcomingPage.pageCount} pageSize={upcomingPage.pageSize} onPageChange={(page) => void changePage(page)} />
        </> : loading && !occurrenceData ? <p className="rounded-2xl border border-border-subtle bg-canvas p-8 text-center text-sm text-text-muted">Loading occurrence details…</p> : occurrenceData && occurrenceGroups?.[selected].length ? <ol className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-canvas">{occurrenceGroups[selected].map((session) => (
          <li key={session.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-semibold text-text-primary">{session.title}</h2><Badge variant="outline">{session.sessionType}</Badge>{session.recoveryGrant && <Badge variant="warning">Recovery Window Active</Badge>}</div>
              <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-text-muted"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />{formatDateTime(session.startTime, { includeYear: true })} → {formatDateTime(session.endTime, { includeYear: true })}</p>
              <p className="mt-1 text-sm text-text-muted">Tutor: {session.tutorName}{session.attendanceSubmittedAt ? ` · Attendance submitted ${formatDateTime(session.attendanceSubmittedAt)}` : ''}</p>
            </div>
            <Link href={`/admin/finances/sessions/${encodeURIComponent(session.id)}`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Open Session</Link>
          </li>
        ))}</ol> : occurrenceData ? <p className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-text-muted">No {categories.find(({ id }) => id === selected)?.label.toLowerCase()} Sessions.</p> : null}
      </div>
    </section>
  );
}
