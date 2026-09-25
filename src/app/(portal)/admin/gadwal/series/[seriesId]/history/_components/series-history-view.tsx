import Link from 'next/link';
import { ArrowLeft, CalendarDays, ExternalLink } from 'lucide-react';
import { Badge } from '@/shared/components/badge';

type SeriesHistory = Awaited<ReturnType<typeof import('../../../../actions').getAdminSeriesHistory>>;
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SeriesHistoryView({ series }: { series: SeriesHistory }) {
  const clock = `${String(Math.floor(series.startMinute / 60) % 12 || 12)}:${String(series.startMinute % 60).padStart(2, '0')} ${series.startMinute >= 720 ? 'PM' : 'AM'}`;
  return <main className="w-full min-w-0 space-y-6">
    <Link href="/admin/gadwal" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary"><ArrowLeft className="h-4 w-4" /> Back to weekly schedules</Link>
    <header className="space-y-2 border-b border-border-subtle pb-5">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{series.status.toLowerCase()}</Badge><span className="text-sm text-text-muted">Read-only schedule history</span></div>
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{series.title}</h1>
      <p className="text-sm text-text-secondary">Tutor: {series.tutorName} · Students: {series.students.join(', ') || 'No current roster recorded'}</p>
      <p className="text-sm text-text-secondary"><CalendarDays className="mr-1 inline h-4 w-4" />{weekdays[series.weekday]} at {clock} · {series.durationMinutes} minutes · Starts {new Date(series.startsOn).toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium' })} · {series.endsOn ? `Schedule end date ${new Date(series.endsOn).toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium' })}` : 'No schedule end date recorded'}</p>
      <p className="text-sm text-text-muted">Schedule details reflect the values currently stored on this series; earlier schedule edits were not separately archived.</p>
      <p className="text-sm text-text-muted">A separate cancellation or end timestamp, action scope, and series-level reason were not recorded. The end date above describes the schedule boundary, not when an Admin changed it.</p>
    </header>
    <section aria-labelledby="occurrences-heading" className="space-y-3">
      <h2 id="occurrences-heading" className="text-lg font-semibold text-text-primary">Sessions and recorded history</h2>
      {series.occurrences.length ? series.occurrences.map((session) => <article key={session.id} className="space-y-3 rounded-xl border border-border-subtle bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-text-primary">{session.title}</h3><p className="text-sm text-text-secondary">{new Date(session.startTime).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })}</p></div><Badge variant={session.status === 'CANCELLED' ? 'outline' : 'secondary'}>{session.historicalOnly ? 'historical record' : session.status.toLowerCase()}</Badge></div>
        <p className="text-sm text-text-secondary">Roster: {session.students.join(', ') || 'No session roster recorded'} · Attendance records: {session.attendances.length ? session.attendances.map((entry) => `${entry.studentName} (${new Date(entry.attendedAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo' })})`).join(', ') : 'None'}</p>
        {session.exceptionReason && <p className="text-sm text-text-secondary">Recorded session note: {session.exceptionReason}</p>}
        <div className="flex flex-wrap gap-3 text-sm"><Link className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-primary" href={`/admin/gadwal?session=${session.id}`}>View session <ExternalLink className="h-4 w-4" /></Link>{(session.transactionCount || session.hasTutorCompensation || session.commissionCount > 0) && <Link className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-primary" href={`/admin/finances/sessions/${session.id}`}>View financial provenance <ExternalLink className="h-4 w-4" /></Link>}</div>
      </article>) : <p className="rounded-xl border border-dashed border-border-subtle p-6 text-sm text-text-muted">No concrete sessions are recorded for this schedule.</p>}
    </section>
  </main>;
}
