'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarClock, ChevronDown, Clock3, Users } from 'lucide-react';
import { Combobox } from '@/shared/components/combobox';
import { TablePagination } from '@/shared/components/table-pagination';
import { useTablePagination } from '@/shared/hooks/use-table-pagination';
import { AttendanceRecoveryAlert } from '@/features/attendance/components/attendance-recovery-alert';
import { SessionRescheduleDialog } from '@/features/sessions/components/session-reschedule-dialog';
import type { WeeklyScheduleSession } from '@/features/sessions/components/weekly-session-schedule';
import type { GadwalSessionItem } from '@/features/sessions/types';
import { formatSeriesSchedule, groupTimetableSessions, type TimetableSessionGroup } from '@/features/sessions/utils/timetable-groups';
import { isRecoveryWindowActive } from '@/features/attendance/utils/recovery-time';
import { canPostponeSession, classifySessionOccurrence, getUpcomingSessions, sortSessionOccurrences } from '@/shared/utils/session-timing';
import { formatDateTime, formatTime } from '@/shared/utils/date-format';
import { getTutorUpcomingSessions, postponeTutorSession } from '../actions';

type TimetableTab = 'ACTIVE' | 'SCHEDULED' | 'COMPLETED';
type Horizon = '7' | '14' | '30' | 'all';

const horizonOptions = [
  { value: 'all', label: 'All upcoming' },
  { value: '7', label: 'Next 7 days' },
  { value: '14', label: 'Next 14 days' },
  { value: '30', label: 'Next 30 days' },
];

export function TutorTimetableView({ tutor, sessions }: { tutor: { id: string; name: string }; sessions: GadwalSessionItem[] }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TimetableTab>('ACTIVE');
  const [horizon, setHorizon] = React.useState<Horizon>('all');
  const [expandedUpcoming, setExpandedUpcoming] = React.useState<GadwalSessionItem[] | null>(null);
  const [loadingUpcoming, setLoadingUpcoming] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [rescheduleSession, setRescheduleSession] = React.useState<WeeklyScheduleSession | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const active = sessions.filter((session) => !session.historicalOnly && session.status !== 'CANCELLED' && classifySessionOccurrence(session.startTime, session.endTime, now) === 'ACTIVE');
  const scheduledSource = horizon === 'all' ? expandedUpcoming ?? sessions : expandedUpcoming ?? [];
  const scheduled = getUpcomingSessions(scheduledSource.filter((session) => !session.historicalOnly && session.status !== 'CANCELLED'), horizon === 'all' ? null : Number(horizon), now);
  const completed = sortSessionOccurrences(sessions.filter((session) => session.status !== 'CANCELLED'), 'COMPLETED', now);
  const activeGroups = groupTimetableSessions(active);
  const scheduledGroups = groupTimetableSessions(scheduled);
  const completedGroups = groupTimetableSessions(completed);
  const activePagination = useTablePagination(activeGroups);
  const scheduledPagination = useTablePagination(scheduledGroups);
  const completedPagination = useTablePagination(completedGroups);
  const resetActivePage = activePagination.setPage;
  const resetScheduledPage = scheduledPagination.setPage;
  const resetCompletedPage = completedPagination.setPage;
  const recoverySessions = sessions.filter((session) => isRecoveryWindowActive(session.recoveryGrant, now));

  React.useEffect(() => {
    resetActivePage(1);
    resetScheduledPage(1);
    resetCompletedPage(1);
  }, [tab, horizon, resetActivePage, resetScheduledPage, resetCompletedPage]);

  async function changeHorizon(value: string) {
    const next = value as Horizon;
    setHorizon(next);
    if (next === 'all') {
      setExpandedUpcoming(null);
      return;
    }
    setLoadingUpcoming(true);
    try {
      const items = await getTutorUpcomingSessions(Number(next) as 7 | 14 | 30);
      setExpandedUpcoming(items);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Upcoming Sessions could not be loaded.');
    } finally {
      setLoadingUpcoming(false);
    }
  }

  async function saveException(sessionId: string, input: { startTime: string; endTime: string; reason: string }) {
    try {
      await postponeTutorSession(sessionId, input);
      setError(null);
      setHorizon('all');
      setExpandedUpcoming(null);
      router.refresh();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'The occurrence could not be postponed.';
      setError(message);
      throw saveError;
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-md border border-brand-border/60 bg-brand-subtle px-2 py-1 text-xs font-semibold text-brand-primary">Faculty portal</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">Timetable</h1>
          <p className="mt-1 text-sm text-text-muted">{tutor.name}&apos;s Sessions by their actual start and end times.</p>
        </div>
        <Link href="/tutor/agenda" className="inline-flex min-h-[44px] w-fit items-center rounded-lg border border-border-subtle bg-canvas px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Back to agenda</Link>
      </header>

      {recoverySessions.length > 0 && <section className="space-y-3" aria-label="Active Admin attendance recovery">
        {recoverySessions.map((session) => <AttendanceRecoveryAlert key={session.id} title={session.title} sessionId={session.id} grant={session.recoveryGrant!} />)}
      </section>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid min-h-[44px] grid-cols-3 rounded-xl border border-border-subtle bg-canvas-subtle p-1" role="tablist" aria-label="Timetable view">
          {(['ACTIVE', 'SCHEDULED', 'COMPLETED'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${tab === value ? 'bg-canvas text-brand-primary shadow-xs' : 'text-text-muted hover:text-text-primary'}`}>{value[0] + value.slice(1).toLowerCase()}</button>)}
        </div>
        {tab === 'SCHEDULED' && <div className="w-full sm:w-52"><Combobox options={horizonOptions} value={horizon} onChange={(value) => { void changeHorizon(value); }} placeholder="Choose a date range" searchPlaceholder="Search date ranges" /></div>}
      </div>

      {error && <p role="alert" className="rounded-lg border border-status-error/30 bg-status-error/5 p-3 text-sm text-status-error">{error}</p>}
      {loadingUpcoming && <p role="status" className="text-sm text-text-muted">Loading upcoming Sessions…</p>}
      {tab === 'ACTIVE' && <GroupedOccurrenceList groups={activePagination.items} now={now} mode="ACTIVE" itemCount={activeGroups.length} page={activePagination.page} pageCount={activePagination.pageCount} pageSize={activePagination.pageSize} onPageChange={activePagination.setPage} onPostpone={setRescheduleSession} />}
      {tab === 'SCHEDULED' && <GroupedOccurrenceList groups={scheduledPagination.items} now={now} mode="SCHEDULED" itemCount={scheduledGroups.length} page={scheduledPagination.page} pageCount={scheduledPagination.pageCount} pageSize={scheduledPagination.pageSize} onPageChange={scheduledPagination.setPage} onPostpone={setRescheduleSession} />}
      {tab === 'COMPLETED' && <GroupedOccurrenceList groups={completedPagination.items} now={now} mode="COMPLETED" itemCount={completedGroups.length} page={completedPagination.page} pageCount={completedPagination.pageCount} pageSize={completedPagination.pageSize} onPageChange={completedPagination.setPage} />}

      <p className="text-xs text-text-muted">Recurring rows expand to dated Session occurrences. Postpone affects one occurrence only; the recurring schedule stays unchanged.</p>
      <SessionRescheduleDialog session={rescheduleSession} onClose={() => setRescheduleSession(null)} onSave={saveException} />
    </div>
  );
}

function GroupedOccurrenceList({ groups, now, mode, itemCount, page, pageCount, pageSize, onPageChange, onPostpone }: {
  groups: TimetableSessionGroup<GadwalSessionItem>[];
  now: number;
  mode: TimetableTab;
  itemCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPostpone?: (session: WeeklyScheduleSession) => void;
}) {
  if (!itemCount) return <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-text-muted">{mode === 'ACTIVE' ? 'No active Session right now.' : mode === 'SCHEDULED' ? 'No upcoming Sessions in this date range.' : 'No past Sessions yet.'}</div>;
  const sessionCount = groups.reduce((count, group) => count + group.sessions.length, 0);
  return <section aria-label={`${mode.toLowerCase()} Sessions`}>
    {mode === 'ACTIVE' && sessionCount > 1 && <p role="alert" className="mb-3 rounded-lg border border-status-warning/40 bg-status-warning/5 p-3 text-sm font-semibold text-text-primary">Schedule conflict: multiple Sessions overlap now. All are shown; ask Admin to resolve the conflict.</p>}
    <ol className="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-canvas">
      {groups.map((group) => group.seriesId ? <li key={group.id}>
        <details>
          <summary className="flex min-h-[72px] cursor-pointer list-none flex-col justify-center gap-2 px-4 py-3 hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><span className="break-words font-semibold text-text-primary">{group.title}</span><span className="rounded-md bg-brand-subtle px-2 py-1 text-xs font-semibold text-brand-primary">{group.sessionType}</span></span>
            <span className="flex shrink-0 items-center justify-between gap-4 text-sm text-text-muted sm:justify-end"><span className="min-w-0">{formatSeriesSchedule(group)}</span><span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-text-primary">{group.sessions.length} {group.sessions.length === 1 ? 'session' : 'sessions'}<ChevronDown className="h-4 w-4" aria-hidden="true" /></span></span>
          </summary>
          <ol className="divide-y divide-border-subtle border-t border-border-subtle bg-canvas-subtle/40">{group.sessions.map((session) => <li key={session.id}><SessionCard session={session} now={now} live={mode === 'ACTIVE'} mode={mode === 'ACTIVE' ? undefined : mode} onPostpone={onPostpone} /></li>)}</ol>
        </details>
      </li> : <li key={group.id}><SessionCard session={group.sessions[0]} now={now} live={mode === 'ACTIVE'} mode={mode === 'ACTIVE' ? undefined : mode} onPostpone={onPostpone} /></li>)}
    </ol>
    <TablePagination itemCount={itemCount} page={page} pageCount={pageCount} pageSize={pageSize} onPageChange={onPageChange} />
  </section>;
}

function SessionCard({ session, now, live = false, mode, onPostpone }: { session: GadwalSessionItem; now: number; live?: boolean; mode?: 'SCHEDULED' | 'COMPLETED'; onPostpone?: (session: WeeklyScheduleSession) => void }) {
  const durationMinutes = Math.max(0, Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60_000));
  const duration = durationMinutes % 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes / 60}h`;
  const occurrenceState = classifySessionOccurrence(session.startTime, session.endTime, now);
  const hasRoster = session.attendanceDisposition ? session.attendanceDisposition === 'HAS_ROSTER' : Boolean(session.roster?.length ?? session.participantCount);
  const recoveryActive = isRecoveryWindowActive(session.recoveryGrant, now);
  const recoveryExpired = Boolean(session.recoveryGrantExpired || (session.recoveryGrant && !recoveryActive && Date.parse(session.recoveryGrant.closesAt) < now));
  const attendanceState = session.status === 'CANCELLED' ? 'Cancelled'
    : session.attendanceDisposition === 'ADMIN_REVIEW' ? 'Admin data review · no Tutor attendance action'
      : session.attendanceDisposition === 'NO_ACTION' || !hasRoster ? 'No Student roster · attendance not required'
        : occurrenceState === 'SCHEDULED' ? 'Scheduled'
          : session.attendanceSubmittedAt ? session.roster?.length && session.roster.every((student) => student.outcome === 'ABSENT') ? 'All students absent · No Tutor payable'
            : session.tutorRateMissing ? 'Needs attention · Tutor rate missing'
              : session.tutorCompensation ? 'Tutor payable recorded'
                : session.attendanceFinalizedAt ? 'Attendance submitted · No Tutor payable' : 'Finalization pending'
          : recoveryActive ? 'Attendance reopened by Admin'
            : recoveryExpired ? 'Admin recovery window expired'
              : new Date(session.attendanceClosesAt || session.deadline).getTime() < now ? 'Attendance missing · Overdue' : 'Attendance missing';
  const attendanceWindowOpen = now >= Date.parse(session.startTime) && now <= Date.parse(session.attendanceClosesAt || session.deadline);
  const canEditAttendance = hasRoster && !session.attendanceSubmittedAt && session.status !== 'CANCELLED' && (attendanceWindowOpen || recoveryActive);
  const mayPostpone = Boolean(onPostpone && session.status !== 'CANCELLED' && canPostponeSession(session.startTime, now));
  const dialogSession: WeeklyScheduleSession = { id: session.id, title: session.title, startTime: session.startTime, endTime: session.endTime, status: session.status, isRescheduled: session.isRescheduled, baseStartTime: session.baseStartTime, rescheduleReason: session.rescheduleReason };
  const canViewAttendance = hasRoster && (live || modeNeedsAttendance(session, now));

  return <article className={`flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${live ? 'border-brand-border bg-brand-subtle/20' : ''}`}>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {live && <span className="rounded-md bg-brand-primary px-2 py-1 text-xs font-bold text-white">LIVE NOW</span>}
        {recoveryActive && <span className="rounded-md border border-status-warning/40 bg-status-warning/5 px-2 py-1 text-xs font-semibold text-text-primary">Attendance reopened by Admin</span>}
        {session.recoveryGrantUsed && <span className="rounded-md border border-status-warning/40 bg-status-warning/5 px-2 py-1 text-xs font-semibold text-text-primary">Late attendance · Admin-authorized</span>}
        <h2 className="break-words text-base font-semibold text-text-primary">{session.title}</h2>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-text-muted"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />{formatDateTime(session.startTime)} → {formatTime(session.endTime)}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs font-medium text-text-muted"><span>{session.sessionType} · {session.roster?.length ?? session.assignedStudents?.length ?? 0} students</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{duration}</span></p>
      {session.isRescheduled && <p className="mt-1 text-xs text-text-muted">Postponed occurrence{session.rescheduleReason ? ` · ${session.rescheduleReason}` : ''}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-primary"><span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-text-muted" aria-hidden="true" />{session.roster?.length ? session.roster.map((student) => student.name).join(', ') : session.assignedStudents?.join(', ') || 'No assigned students'}</span></div>
      <p className="mt-2 text-xs font-semibold text-text-muted">{live && canEditAttendance ? 'Attendance action available' : attendanceState}</p>
      {session.recoveryGrantUsed?.screenshotUnavailable && <p className="mt-1 text-xs text-text-muted">Screenshot unavailable / requirement waived.</p>}
    </div>
    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
      {canViewAttendance && !session.attendanceSubmittedAt && <Link href={`/tutor/attendance/${encodeURIComponent(session.id)}`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover">{canEditAttendance ? recoveryActive ? 'Continue attendance' : 'Attendance' : 'View attendance'} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      {mayPostpone && <button type="button" onClick={() => onPostpone?.(dialogSession)} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border-subtle bg-canvas px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Postpone</button>}
      {canViewAttendance && session.attendanceSubmittedAt && <Link href={`/tutor/attendance/${encodeURIComponent(session.id)}`} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border-subtle bg-canvas px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">View attendance</Link>}
    </div>
  </article>;
}

function modeNeedsAttendance(session: GadwalSessionItem, now: number) {
  return classifySessionOccurrence(session.startTime, session.endTime, now) === 'COMPLETED';
}
