'use client';

import Link from 'next/link';
import { CalendarDays, Clock3, Users } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatDateTime } from '@/shared/utils/date-format';
import type { AdminOverviewData } from './admin-overview-data';
import { recentSessionState } from '@/features/sessions/utils/recent-session-presentation';

export function AdminOverviewView({ date, asOf, checkInWindowHours, sessions }: AdminOverviewData) {
  const now = new Date(asOf);
  const finished = sessions.filter(({ status }) => status === 'COMPLETED').length;
  const active = sessions.filter(({ status }) => status === 'ACTIVE').length;
  const pendingAttendance = sessions.filter(({ status, attendanceSaved }) => (status === 'SCHEDULED' || status === 'ACTIVE') && !attendanceSaved).length;

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

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Today's session summary">
        <SummaryCard label="Scheduled today" value={sessions.length} icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />} />
        <SummaryCard label="In progress" value={active} icon={<Clock3 aria-hidden="true" className="h-5 w-5" />} />
        <SummaryCard label="Attendance pending" value={pendingAttendance} icon={<Users aria-hidden="true" className="h-5 w-5" />} detail={`${finished} completed`} />
      </section>

      <Card className="border-border-subtle bg-canvas">
        <CardHeader><CardTitle className="text-lg">Today&apos;s sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? <p className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-muted">No sessions are scheduled for today.</p> : (
            <ol className="divide-y divide-border-subtle">
              {sessions.map((session) => <li key={session.id} className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-text-primary">{session.title}</h3><Badge variant="outline">{session.sessionType}</Badge><Badge variant={session.status === 'COMPLETED' ? 'success' : 'outline'}>{recentSessionState(session.status, session.startTime, session.endTime, session.attendanceSaved, now, checkInWindowHours)}</Badge></div>
                  <p className="mt-1 text-sm text-text-muted">{formatDateTime(session.startTime)} – {formatDateTime(session.endTime)} · Tutor: {session.tutorName}</p>
                  <p className="mt-1 text-xs text-text-muted">{session.attendeeCount} attendance record{session.attendeeCount === 1 ? '' : 's'} · {session.attendanceSaved ? 'Attendance submitted' : session.status === 'COMPLETED' ? 'Attendance save time unavailable' : 'Attendance not submitted'}</p>
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

function SummaryCard({ label, value, icon, detail }: { label: string; value: number; icon: React.ReactNode; detail?: string }) {
  return <Card className="border-border-subtle bg-canvas"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm text-text-muted">{label}</p><p className="mt-1 font-mono text-2xl font-bold tabular-nums text-text-primary">{value}</p>{detail && <p className="text-xs text-text-muted">{detail}</p>}</div><span className="text-brand-primary">{icon}</span></CardContent></Card>;
}
