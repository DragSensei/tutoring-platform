'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarDays, Clock3, Users } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatDateTime } from '@/shared/utils/date-format';
import type { AdminOverviewData } from './admin-overview-data';
import { classifySessionOccurrence } from '@/shared/utils/session-timing';
import { NeedsAttentionPanel } from './needs-attention-panel';

export function AdminOverviewView({ date, asOf, sessions, attention, attentionCount }: AdminOverviewData) {
  const now = new Date(asOf);
  const occurrenceState = (session: AdminOverviewData['sessions'][number]) => session.status === 'CANCELLED' ? 'CANCELLED' : classifySessionOccurrence(session.startTime, session.endTime, now);
  const finished = sessions.filter((session) => occurrenceState(session) === 'COMPLETED').length;
  const active = sessions.filter((session) => occurrenceState(session) === 'ACTIVE').length;
  const pendingAttendance = sessions.filter((session) => occurrenceState(session) !== 'SCHEDULED' && occurrenceState(session) !== 'CANCELLED' && !session.attendanceSubmitted).length;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-primary">Admin · Daily operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Today</h1>
          <p className="mt-1 text-sm text-text-muted">Sessions scheduled for {new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'full' }).format(new Date(`${date}T12:00:00Z`))} (Cairo time).</p>
        </div>
        <Link href="/admin/gadwal" className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover">Open schedule</Link>
      </header>

      {attention.length > 0 && <NeedsAttentionPanel items={attention} />}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Today's session summary">
        <SummaryCard label="Scheduled today" value={sessions.length} icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />} />
        <SummaryCard label="In progress" value={active} icon={<Clock3 aria-hidden="true" className="h-5 w-5" />} />
        <SummaryCard label="Attendance pending" value={pendingAttendance} icon={<Users aria-hidden="true" className="h-5 w-5" />} detail={`${finished} completed`} />
        <SummaryCard href="/admin/needs-attention" label="Sessions need attention" value={attentionCount} icon={<AlertTriangle aria-hidden="true" className="h-5 w-5" />} />
      </section>

      <Card className="border-border-subtle bg-canvas">
        <CardHeader><CardTitle className="text-lg">Today&apos;s sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? <p className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-muted">No sessions are scheduled for today.</p> : (
            <ol className="divide-y divide-border-subtle">
              {sessions.map((session) => <li key={session.id} className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-text-primary">{session.title}</h3><Badge variant="outline">{session.sessionType}</Badge><Badge variant={occurrenceState(session) === 'COMPLETED' ? 'success' : 'outline'}>{occurrenceState(session)}</Badge></div>
                  <p className="mt-1 text-sm text-text-muted">{formatDateTime(session.startTime)} – {formatDateTime(session.endTime)} · Tutor: {session.tutorName}</p>
                  <p className="mt-1 text-xs text-text-muted">{session.attendeeCount} present record{session.attendeeCount === 1 ? '' : 's'} · {session.attendanceSubmitted ? 'Attendance submitted' : session.attendanceSaved ? 'Draft saved · awaiting final submission' : 'No final submission'}</p>
                </div>
                <Link href={`/admin/gadwal?session=${encodeURIComponent(session.id)}`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-border-subtle px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Manage session</Link>
              </li>)}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon, detail, href }: { label: string; value: number; icon: React.ReactNode; detail?: string; href?: string }) {
  const card = <Card className="h-full border-border-subtle bg-canvas"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm text-text-muted">{label}</p><p className="mt-1 font-mono text-2xl font-bold tabular-nums text-text-primary">{value}</p>{detail && <p className="text-xs text-text-muted">{detail}</p>}</div><span className="text-brand-primary">{icon}</span></CardContent></Card>;
  return href ? <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">{card}</Link> : card;
}
