'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { SessionEvidenceUpload, type LocalEvidenceMetadata } from '@/features/attendance/components/session-evidence-upload';
import { AttendanceRecoveryAlert } from '@/features/attendance/components/attendance-recovery-alert';
import { MIN_SESSION_NOTE_LENGTH, attendanceOutcomes, createAttendanceReviewState, markAllAttendance, setAttendanceOutcome } from '@/features/attendance/utils/attendance-review';
import { isRecoveryWindowActive } from '@/features/attendance/utils/recovery-time';
import { saveTutorAttendanceDraft, submitTutorAttendance } from '../../actions';
import { formatDateTime, formatTime } from '@/shared/utils/date-format';
import { getAttendanceWindowState } from '@/shared/utils/deadline';
import type { GadwalSessionItem } from '@/features/sessions/types';

interface AttendanceWorkspaceProps {
  initialSessions: GadwalSessionItem[];
  sessionId: string;
}

export function AttendanceWorkspace({ initialSessions, sessionId }: AttendanceWorkspaceProps) {
  const router = useRouter();
  const session = initialSessions.find((item) => item.id === sessionId && !item.historicalOnly) || null;
  const [now, setNow] = React.useState<number | null>(null);
  const [review, setReview] = React.useState(() => createAttendanceReviewState(session?.roster || []));
  const [notes, setNotes] = React.useState(session?.attendanceNotes || '');
  const [evidence, setEvidence] = React.useState<LocalEvidenceMetadata | null>(null);
  const [lateExplanation, setLateExplanation] = React.useState('');
  const [tutorAttested, setTutorAttested] = React.useState(false);
  const [screenshotUnavailable, setScreenshotUnavailable] = React.useState<boolean | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!session) return <div className="rounded-2xl border border-border-subtle bg-canvas p-8 text-center"><h1 className="text-xl font-semibold text-text-primary">Session not found</h1><p className="mt-2 text-sm text-text-muted">This Session is not available in the current Tutor schedule.</p><Link href="/tutor/agenda" className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white">Back to agenda</Link></div>;
  const activeSession = session;

  const roster = session.roster || [];
  const currentTime = now ?? Date.now();
  const normalClose = new Date(session.attendanceClosesAt || session.deadline);
  const hasRoster = session.attendanceDisposition ? session.attendanceDisposition === 'HAS_ROSTER' : roster.length > 0;
  const attendanceWindowState = getAttendanceWindowState(session.startTime, normalClose, currentTime);
  const recoveryGrant = isRecoveryWindowActive(session.recoveryGrant, currentTime)
    ? session.recoveryGrant
    : null;
  const isLateMode = currentTime > normalClose.getTime() && Boolean(recoveryGrant);
  const isSubmitted = Boolean(session.attendanceSubmittedAt);
  const canEdit = hasRoster && !isSubmitted && session.status !== 'CANCELLED' && (attendanceWindowState === 'OPEN' || Boolean(recoveryGrant));
  const canSubmit = canEdit && currentTime >= new Date(session.endTime).getTime();
  const outcomes = attendanceOutcomes(review);
  const attendanceComplete = roster.length > 0 && roster.every((student) => outcomes[student.id] === 'PRESENT' || outcomes[student.id] === 'ABSENT');
  const notesComplete = notes.trim().length >= MIN_SESSION_NOTE_LENGTH;
  const lateDetailsComplete = !isLateMode || (lateExplanation.trim().length >= MIN_SESSION_NOTE_LENGTH && tutorAttested && screenshotUnavailable !== null);
  const canSubmitComplete = attendanceComplete && notesComplete && lateDetailsComplete && (isLateMode || Boolean(evidence));

  function saveDraft() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTutorAttendanceDraft({ sessionId: activeSession.id, outcomes, notes });
      setMessage(result.success ? 'Draft saved. This does not settle Student wallets or create Tutor pay.' : result.message);
      if (result.success) router.refresh();
    });
  }

  function submit() {
    if (!canSubmit) return;
    if (!canSubmitComplete) {
      setMessage(isLateMode
        ? 'Choose an outcome for every Student, add the required notes, explain why attendance is late, attest accuracy, and report screenshot availability.'
        : 'Choose an outcome for every Student, add the required notes, and attach the normal screenshot.');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await submitTutorAttendance({
        sessionId: activeSession.id,
        outcomes,
        notes,
        normalEvidenceSelected: !isLateMode && Boolean(evidence),
        ...(isLateMode && recoveryGrant ? {
          recoveryGrantId: recoveryGrant.id,
          lateExplanation,
          tutorAttested,
          screenshotUnavailable: screenshotUnavailable === true,
        } : {}),
      });
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setMessage(result.alreadySubmitted ? 'Attendance was already submitted. No duplicate Tutor payable was created.' : 'Final attendance submitted. Student settlement and Tutor pay follow the recorded attendance.');
      router.refresh();
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="space-y-3 border-b border-border-subtle pb-5">
        <Link href="/tutor/agenda" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to agenda</Link>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand-primary">{session.sessionType}</span>{isSubmitted && <span className="rounded-md border border-status-success/30 bg-status-success/5 px-2.5 py-1 text-xs font-semibold text-text-primary">Attendance submitted</span>}{session.recoveryGrantUsed && <span className="rounded-md border border-status-warning/40 bg-status-warning/5 px-2.5 py-1 text-xs font-semibold text-text-primary">Late attendance · Admin-authorized</span>}</div>
        <h1 className="break-words text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">{session.title}</h1>
        <p className="text-sm text-text-muted">{formatDateTime(session.startTime)} → {formatTime(session.endTime)} · {session.roster?.length ?? 0} students</p>
        {session.recoveryGrant && <AttendanceRecoveryAlert title={session.title} sessionId={session.id} grant={session.recoveryGrant} href="#attendance-roster-heading" cta="Continue editing attendance" />}
        {!hasRoster && <p role="status" className="rounded-lg border border-border-subtle bg-canvas-subtle p-3 text-sm text-text-primary">{session.attendanceDisposition === 'ADMIN_REVIEW' ? 'Legacy attendance or financial history exists without a Student roster. Tutor action is unavailable; this Session remains for Admin data review.' : 'No Tutor attendance is required because this Session has no Student roster. The Session record is preserved.'}</p>}
        {isLateMode && <p className="rounded-lg border border-status-warning/40 bg-status-warning/5 p-3 text-sm text-text-primary">The normal screenshot requirement was waived because this attendance was reopened by Admin after the original deadline. A screenshot is optional if available.</p>}
        {session.recoveryGrantUsed?.screenshotUnavailable && <p className="text-sm text-text-muted">Screenshot unavailable / requirement waived.</p>}
        {!isSubmitted && <p className="text-xs text-text-muted">Attendance deadline: {formatDateTime(session.attendanceClosesAt || normalClose.toISOString(), { includeYear: true })}{recoveryGrant ? ` · Recovery closes ${formatDateTime(recoveryGrant.closesAt, { includeYear: true })}` : ''}</p>}
        {!isSubmitted && !recoveryGrant && session.recoveryGrantExpired && <p className="rounded-lg border border-border-subtle bg-canvas-subtle p-3 text-sm text-text-muted">The Admin recovery window expired. Attendance editing is closed.</p>}
      </header>

      <section className="rounded-2xl border border-border-subtle bg-canvas" aria-labelledby="attendance-roster-heading">
        <div className="flex flex-col gap-4 border-b border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 id="attendance-roster-heading" className="text-lg font-semibold text-text-primary">Student attendance</h2><p className="mt-1 text-sm text-text-muted">Choose Present or Absent for each Student. Unanswered Students stay unresolved.</p></div>
          {canEdit && roster.length > 0 && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-[44px] px-3" onClick={() => setReview(markAllAttendance(roster, 'PRESENT'))}>Mark all present</Button><Button type="button" variant="ghost" className="min-h-[44px] px-3" onClick={() => setReview(markAllAttendance(roster, 'ABSENT'))}>Mark all absent</Button></div>}
        </div>
        {!roster.length ? <p className="p-8 text-center text-sm text-text-muted">No Tutor attendance action is available without an assigned Student roster.</p> : <ol className="divide-y divide-border-subtle">{roster.map((student) => {
          const outcome = outcomes[student.id] ?? null;
          return <li key={student.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="truncate font-semibold text-text-primary">{student.name}</p><p className="truncate text-xs text-text-muted">{student.email}</p></div>
            {canEdit ? <div className="grid w-full grid-cols-2 gap-2 sm:w-auto"><AttendanceChoice value="PRESENT" selected={outcome === 'PRESENT'} disabled={isPending} onClick={() => setReview((current) => setAttendanceOutcome(current, student.id, 'PRESENT'))} /><AttendanceChoice value="ABSENT" selected={outcome === 'ABSENT'} disabled={isPending} onClick={() => setReview((current) => setAttendanceOutcome(current, student.id, 'ABSENT'))} /></div> : <span className="rounded-md border border-border-subtle px-3 py-2 text-sm font-semibold text-text-primary">{outcome ?? 'Unresolved'}</span>}
          </li>;
        })}</ol>}
      </section>

      {hasRoster && <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-border-subtle bg-canvas p-4 sm:p-5" aria-labelledby="session-notes-heading">
          <div className="flex items-baseline justify-between gap-3"><h2 id="session-notes-heading" className="text-lg font-semibold text-text-primary">Session notes <span className="text-brand-primary">Required</span></h2><span className="text-xs tabular-nums text-text-muted">{notes.trim().length}</span></div>
          <textarea id="session-notes" value={notes} onChange={(event) => setNotes(event.target.value)} readOnly={!canEdit} minLength={MIN_SESSION_NOTE_LENGTH} maxLength={5000} rows={6} placeholder="Summarize progress, material covered, and follow-up." className="w-full resize-y rounded-lg border border-border-subtle bg-canvas px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
          <p className="text-xs text-text-muted">At least {MIN_SESSION_NOTE_LENGTH} characters. Draft notes can be saved before final submission.</p>
        </section>

        {canEdit && <section className="space-y-3">
          <SessionEvidenceUpload value={evidence} required={!isLateMode} onChange={(value) => setEvidence(value)} />
          {isLateMode && <div className="space-y-3 rounded-2xl border border-border-subtle bg-canvas p-4 sm:p-5">
            <label htmlFor="late-attendance-explanation" className="block text-sm font-semibold text-text-primary">Attendance delay reason</label>
            <textarea id="late-attendance-explanation" value={lateExplanation} onChange={(event) => setLateExplanation(event.target.value)} rows={3} maxLength={2000} className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary" />
            <label className="flex min-h-[44px] items-center gap-3 text-sm text-text-primary"><input type="checkbox" checked={tutorAttested} onChange={(event) => setTutorAttested(event.target.checked)} className="h-5 w-5 accent-brand-primary" />I attest that the attendance I submitted is accurate.</label>
            <fieldset className="space-y-2"><legend className="text-sm font-semibold text-text-primary">Screenshot availability</legend><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={screenshotUnavailable === false} onClick={() => setScreenshotUnavailable(false)} className={`min-h-[44px] rounded-lg border px-3 text-sm font-semibold ${screenshotUnavailable === false ? 'border-brand-primary bg-brand-subtle text-brand-primary' : 'border-border-subtle bg-canvas text-text-primary'}`}>Available</button><button type="button" aria-pressed={screenshotUnavailable === true} onClick={() => setScreenshotUnavailable(true)} className={`min-h-[44px] rounded-lg border px-3 text-sm font-semibold ${screenshotUnavailable === true ? 'border-brand-primary bg-brand-subtle text-brand-primary' : 'border-border-subtle bg-canvas text-text-primary'}`}>Unavailable</button></div><p className="text-xs text-text-muted">A screenshot is optional in recovery mode and stays in this browser; it is not uploaded or verified by the server.</p></fieldset>
          </div>}
        </section>}
      </div>}

      <section className="space-y-4 rounded-2xl border border-border-subtle bg-canvas p-4 sm:p-5" aria-labelledby="completion-heading">
        <h2 id="completion-heading" className="text-lg font-semibold text-text-primary">Attendance status</h2>
        {isSubmitted ? <p className="text-sm text-text-primary">Final attendance submitted {session.attendanceSubmittedAt && formatDateTime(session.attendanceSubmittedAt, { includeYear: true })}. Drafts do not create Tutor compensation.</p>
          : !hasRoster ? <p className="text-sm text-text-muted">No Tutor attendance is required. Existing attendance and financial history, if present, is left unchanged for Admin review.</p>
            : <ul className="grid gap-2 text-sm sm:grid-cols-3"><Checklist complete={attendanceComplete} label="Every Student has an outcome" /><Checklist complete={notesComplete} label="Session notes written" /><Checklist complete={isLateMode ? lateDetailsComplete : Boolean(evidence)} label={isLateMode ? 'Attendance delay reason and attestation complete' : 'Normal screenshot selected locally'} /></ul>}
        {message && <p role="status" className="rounded-lg border border-border-subtle bg-canvas-subtle p-3 text-sm text-text-primary">{message}</p>}
        {!isSubmitted && hasRoster && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-[44px]" disabled={!canEdit || isPending} isLoading={isPending} onClick={saveDraft}>Save draft</Button>
          {canSubmit && <Button type="button" className="min-h-[44px]" disabled={isPending} isLoading={isPending} onClick={submit}><ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />Submit final attendance</Button>}
        </div>}
        {!isSubmitted && hasRoster && !canEdit && <p className="text-sm text-text-muted">{session.status === 'CANCELLED' ? 'Cancelled Sessions cannot record attendance.' : currentTime < new Date(session.startTime).getTime() ? 'Drafts open when the Session starts.' : 'The attendance window is closed. Ask Admin to review this Session.'}</p>}
        {!isSubmitted && <p className="text-xs text-text-muted">Saving a draft only stores work in progress. Final submission records attendance; Student settlement waits for the normal deadline, and eligible Tutor compensation is created after the Session ends.</p>}
      </section>
    </div>
  );
}

function AttendanceChoice({ value, selected, disabled, onClick }: { value: 'PRESENT' | 'ABSENT'; selected: boolean; disabled: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={`min-h-[44px] rounded-lg border px-4 text-sm font-semibold ${selected ? 'border-brand-primary bg-brand-primary text-white' : 'border-border-subtle bg-canvas text-text-primary hover:bg-canvas-subtle'}`}>{value === 'PRESENT' ? 'Present' : 'Absent'}</button>;
}

function Checklist({ complete, label }: { complete: boolean; label: string }) {
  const Icon = complete ? CheckCircle2 : Circle;
  return <li className={`flex items-center gap-2 ${complete ? 'text-text-primary' : 'text-text-muted'}`}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}</li>;
}
