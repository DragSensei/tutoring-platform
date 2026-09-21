'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, Circle, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { SessionEvidenceUpload, type LocalEvidenceMetadata } from '@/features/attendance/components/session-evidence-upload';
import { saveTutorAttendance } from '../../actions';
import {
  MIN_SESSION_NOTE_LENGTH,
  createAttendanceReviewState,
  getPresentStudentIds,
  isAttendanceWorkflowComplete,
  markAllAttendance,
  toggleStudentAttendance,
} from '@/features/attendance/utils/attendance-review';
import { formatDateTime, formatTime } from '@/shared/utils/date-format';
import { resolveEffectiveSessionTiming } from '@/shared/utils/session-timing';
import type { GadwalSessionItem } from '@/features/sessions/types';
import { getStoredScheduleExceptions } from '../../../dashboard/_components/session-storage';

interface AttendanceWorkspaceProps {
  initialSessions: GadwalSessionItem[];
  sessionId: string;
}

export function AttendanceWorkspace({ initialSessions, sessionId }: AttendanceWorkspaceProps) {
  const router = useRouter();
  const initialSession = initialSessions.find((item) => item.id === sessionId) || null;
  const session: GadwalSessionItem | null = initialSession;
  const [review, setReview] = React.useState(() =>
    createAttendanceReviewState(initialSession?.roster || [], initialSession?.status === 'COMPLETED')
  );
  const [notes, setNotes] = React.useState(initialSession?.attendanceNotes || '');
  const [evidence, setEvidence] = React.useState<LocalEvidenceMetadata | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [effectiveStartTime, setEffectiveStartTime] = React.useState(initialSession?.startTime || '');
  const [effectiveEndTime, setEffectiveEndTime] = React.useState(initialSession?.endTime || '');
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (initialSession) {
      const exception = getStoredScheduleExceptions()[initialSession.id];
      const timing = resolveEffectiveSessionTiming(
        initialSession.startTime,
        initialSession.endTime,
        exception?.effectiveStartTime
      );
      setEffectiveStartTime(timing.startTime);
      setEffectiveEndTime(timing.endTime);
    }
  }, [initialSession, initialSessions, sessionId]);

  if (!session) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-xs">
        <h1 className="text-xl font-semibold text-stone-900">Session not found</h1>
        <p className="mt-2 text-sm text-stone-500">This session is not available in the current tutor schedule.</p>
        <Link href="/tutor/agenda" className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
          Back to agenda
        </Link>
      </div>
    );
  }

  const roster = session.roster || [];
  const presentStudentIds = getPresentStudentIds(roster, review);
  const isComplete = isAttendanceWorkflowComplete(review, notes, Boolean(evidence));
  const isEditing = session.status === 'COMPLETED';

  const completeWorkflow = () => {
    if (!isComplete) {
      setValidationError('Review attendance, add at least 12 characters of notes, and attach screenshot evidence.');
      return;
    }

    startTransition(async () => {
      const result = await saveTutorAttendance({
        sessionId: session.id,
        presentStudentIds,
        notes,
      });

      if (!result.success) {
        setValidationError(result.message);
        return;
      }

      router.push(`/tutor/agenda?completed=${encodeURIComponent(result.sessionId)}&present=${result.presentCount}`);
    });
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-stone-200/80 pb-6">
        <Link href="/tutor/agenda" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to agenda
        </Link>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand-primary">{session.sessionCode || 'SESSION'}</span>
              <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium capitalize text-stone-600">{session.sessionType.toLowerCase()}</span>
              <span className="rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600">{session.status}</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{session.title}</h1>
            <p className="mt-2 text-sm text-stone-600">
              {formatDateTime(effectiveStartTime)}–{formatTime(effectiveEndTime)}
              {effectiveStartTime !== session.startTime ? ` · Recurring ${formatDateTime(session.startTime)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Users className="h-4 w-4 text-stone-400" aria-hidden="true" />
            <span><strong className="font-semibold text-stone-900 tabular-nums">{roster.length}</strong> enrolled</span>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <section className="rounded-2xl border border-stone-200/80 bg-white shadow-xs" aria-labelledby="attendance-roster-heading">
          <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 id="attendance-roster-heading" className="text-xl font-semibold text-stone-900">Student roster</h2>
              <p className="mt-1 text-sm text-stone-500">
                {review.isReviewed ? `${presentStudentIds.length} present · ${roster.length - presentStudentIds.length} absent` : 'Review attendance before completing the session.'}
              </p>
            </div>
            {roster.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-[44px] px-3" onClick={() => { setReview(markAllAttendance(roster, true)); setValidationError(null); }}>
                  Mark all present
                </Button>
                <Button type="button" variant="ghost" className="min-h-[44px] px-3" onClick={() => { setReview(markAllAttendance(roster, false)); setValidationError(null); }}>
                  Mark all absent
                </Button>
              </div>
            )}
          </div>

          {roster.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">No students are assigned to this session.</div>
          ) : (
            <div className="divide-y divide-stone-100 p-2 sm:p-3">
              {roster.map((student) => {
                const isPresent = Boolean(review.presenceByStudentId[student.id]);
                return (
                  <button
                    key={student.id}
                    type="button"
                    aria-pressed={isPresent}
                    onClick={() => { setReview((current) => toggleStudentAttendance(current, student.id)); setValidationError(null); }}
                    className={`flex min-h-[64px] w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary sm:px-4 ${
                      isPresent ? 'bg-brand-subtle/40' : 'hover:bg-stone-50'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${isPresent ? 'border-brand-primary bg-brand-primary text-white' : 'border-stone-300 bg-white text-stone-500'}`}>
                        {isPresent ? <Check className="h-5 w-5" aria-hidden="true" /> : student.name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-stone-900">{student.name}</span>
                        <span className="block truncate text-xs text-stone-500">{student.email}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${isPresent ? 'bg-brand-primary text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-6" aria-label="Session documentation and completion">
          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="session-notes-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="session-notes-heading" className="text-lg font-semibold text-stone-900">Session notes <span className="text-brand-primary">Required</span></h2>
              <span className="text-xs tabular-nums text-stone-500">{notes.trim().length}</span>
            </div>
            <label htmlFor="session-notes" className="sr-only">Session notes</label>
            <textarea
              id="session-notes"
              value={notes}
              onChange={(event) => { setNotes(event.target.value); setValidationError(null); }}
              minLength={MIN_SESSION_NOTE_LENGTH}
              rows={6}
              placeholder="Summarize progress, material covered, and any follow-up."
              className="mt-3 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <p className="mt-2 text-xs text-stone-500">At least {MIN_SESSION_NOTE_LENGTH} characters.</p>
          </section>

          <SessionEvidenceUpload value={evidence} onChange={(nextEvidence) => { setEvidence(nextEvidence); setValidationError(null); }} />

          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="completion-heading">
            <h2 id="completion-heading" className="text-lg font-semibold text-stone-900">Completion</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                [review.isReviewed, review.isReviewed ? `Attendance reviewed (${presentStudentIds.length} present)` : 'Attendance not reviewed'],
                [notes.trim().length >= MIN_SESSION_NOTE_LENGTH, 'Required notes written'],
                [Boolean(evidence), 'Screenshot evidence attached locally'],
              ].map(([complete, label]) => (
                <li key={String(label)} className={`flex items-center gap-2 ${complete ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {complete ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            {validationError && <p role="alert" className="mt-4 text-sm font-medium text-brand-primary">{validationError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <Link href="/tutor/agenda" className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50">Cancel</Link>
              <Button type="button" className="min-h-[44px] flex-1 gap-2" isLoading={isPending} onClick={completeWorkflow}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {isEditing ? 'Save attendance changes' : 'Complete attendance'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-stone-500">Attendance and notes are saved securely. Screenshot evidence remains on this device and is not uploaded.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
