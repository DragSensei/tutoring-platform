'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Save } from 'lucide-react';
import { Combobox, MultiCombobox } from '@/shared/components/combobox';
import { Button } from '@/shared/components/button';
import type { CreateSessionInput } from '@/features/sessions/schemas';
import type { PlatformPoliciesData } from '@/features/policies/server/policy-actions';
import { createAdminSession, updateAdminSession } from '../actions';
import { hasChangedDefaultStartTime, toDateTimeInputValue } from './session-form-utils';
import { SessionRecap, type SessionRecapData } from './session-recap';

interface FormPerson {
  id: string;
  name: string;
  email: string;
}

interface InitialSession {
  id: string;
  title: string;
  tutorId: string;
  sessionType: 'PRIVATE' | 'GROUP';
  startTime: string;
  endTime: string;
  price: number;
  roster?: { id: string; name: string; email: string; attended: boolean }[];
}

interface SessionFormProps {
  mode: 'create' | 'edit';
  tutors: FormPerson[];
  students: FormPerson[];
  policy: PlatformPoliciesData;
  defaultStartTime?: string;
  initialSession?: InitialSession;
}

export function SessionForm({ mode, tutors, students, policy, defaultStartTime, initialSession }: SessionFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const initialStartTime = initialSession ? toDateTimeInputValue(initialSession.startTime) : defaultStartTime || '';
  const initialDuration = initialSession
    ? Math.max(1, (new Date(initialSession.endTime).getTime() - new Date(initialSession.startTime).getTime()) / 3_600_000)
    : 2;
  const [title, setTitle] = React.useState(initialSession?.title || '');
  const [tutorId, setTutorId] = React.useState(initialSession?.tutorId || tutors[0]?.id || '');
  const [sessionType, setSessionType] = React.useState<'PRIVATE' | 'GROUP'>(initialSession?.sessionType || 'GROUP');
  const [participantIds, setParticipantIds] = React.useState(initialSession?.roster?.map((student) => student.id) || []);
  const [startTime, setStartTime] = React.useState(initialStartTime);
  const [duration, setDuration] = React.useState(String(initialDuration));
  const [hasEditedStartTime, setHasEditedStartTime] = React.useState(isEdit);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<CreateSessionInput | null>(null);
  const [recap, setRecap] = React.useState<SessionRecapData | null>(null);
  const handleViewSchedule = React.useCallback(() => router.push('/admin/gadwal'), [router]);

  const tutorOptions = tutors.map((tutor) => ({ value: tutor.id, label: tutor.name, sublabel: tutor.email }));
  const studentOptions = students.map((student) => ({ value: student.id, label: student.name, sublabel: student.email }));
  const typeOptions = [
    { value: 'PRIVATE', label: 'PRIVATE', sublabel: `${policy.privateSessionPrice.toFixed(2)} EGP · 1 student` },
    { value: 'GROUP', label: 'GROUP', sublabel: `${policy.groupSessionPrice.toFixed(2)} EGP · 1–4 students` },
  ];

  function buildPayload(): CreateSessionInput {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + Number(duration) * 3_600_000);
    return {
      title: title.trim(),
      tutorId,
      sessionType,
      participantIds,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  }

  async function submitPayload(payload: CreateSessionInput) {
    setError(null);
    setIsSubmitting(true);
    try {
      const saved = isEdit && initialSession
        ? await updateAdminSession(initialSession.id, payload)
        : await createAdminSession(payload);
      setRecap({
        title: saved.title,
        sessionType: saved.sessionType,
        price: saved.price,
        tutorName: saved.tutorName,
        assignedStudents: saved.assignedStudents,
        startTime: saved.startTime,
        endTime: saved.endTime,
        operation: isEdit ? 'updated' : 'created',
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save this session');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !tutorId || !startTime || !Number(duration)) {
      setError('Complete the title, tutor, start time, and duration before saving.');
      return;
    }
    if (participantIds.length < 1 || (sessionType === 'PRIVATE' && participantIds.length !== 1)) {
      setError(sessionType === 'PRIVATE' ? 'Private sessions require exactly one student.' : 'Select at least one student.');
      return;
    }

    const payload = buildPayload();
    if (!isEdit && !hasChangedDefaultStartTime(hasEditedStartTime)) {
      setPendingPayload(payload);
      return;
    }
    await submitPayload(payload);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-stone-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/admin/gadwal')} className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Gadwal
          </button>
          <span className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Admin Console · Timetable</span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{isEdit ? 'Edit Session' : 'New Session'}</h1>
          <p className="mt-1 text-sm text-stone-500">Set the roster and timing once; the same persisted session drives Admin, Tutor, and Student views.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Session Title" className="md:col-span-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="e.g. Advanced Calculus · Chapter 4 Review" className={inputClass} />
          </Field>
          <Field label="Tutor">
            <Combobox options={tutorOptions} value={tutorId} onChange={setTutorId} placeholder="Select tutor" searchPlaceholder="Search faculty mentors" required />
          </Field>
          <Field label="Session Type">
            <Combobox
              options={typeOptions}
              value={sessionType}
              onChange={(value) => {
                const nextType = value as 'PRIVATE' | 'GROUP';
                setSessionType(nextType);
                if (nextType === 'PRIVATE') setParticipantIds((current) => current.slice(0, 1));
              }}
              placeholder="Select session type"
              searchPlaceholder="Search session types"
              required
            />
            <p className="mt-1 text-xs text-stone-500">Current policy: PRIVATE {policy.privateSessionPrice.toFixed(2)} EGP · GROUP {policy.groupSessionPrice.toFixed(2)} EGP</p>
          </Field>
        </div>

        <Field label={`Students · ${sessionType === 'PRIVATE' ? 'exactly 1' : '1–4'} required`}>
          <MultiCombobox
            options={studentOptions}
            values={participantIds}
            onChange={setParticipantIds}
            maxSelections={sessionType === 'PRIVATE' ? 1 : 4}
            name="participantIds"
            placeholder="Search and assign students"
            searchPlaceholder="Search by name or email"
            emptyMessage="No matching Student accounts."
          />
        </Field>

        <div className="grid gap-5 border-t border-stone-100 pt-5 sm:grid-cols-[1fr_180px]">
          <Field label="Start date and time">
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              <input value={startTime} onChange={(event) => { setStartTime(event.target.value); setHasEditedStartTime(true); }} type="datetime-local" required className={`${inputClass} pl-10`} />
            </div>
            {!isEdit && !hasEditedStartTime && <p className="mt-1 text-xs text-amber-700">This is the default suggested time; you can review it before creating.</p>}
          </Field>
          <Field label="Duration (hours)">
            <input value={duration} onChange={(event) => setDuration(event.target.value)} type="number" min="1" max="8" step="0.5" required className={inputClass} />
          </Field>
        </div>

        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800">{error}</p>}

        <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => router.push('/admin/gadwal')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="min-h-[44px] gap-2">
            <Save className="h-4 w-4" aria-hidden="true" /> {isEdit ? 'Save changes' : 'Create session'}
          </Button>
        </div>
      </form>

      {pendingPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4" role="dialog" aria-modal="true" aria-labelledby="default-time-confirmation">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl">
            <h2 id="default-time-confirmation" className="text-lg font-semibold text-stone-900">Review the suggested time?</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">You haven&apos;t changed the default session date/time. Create it anyway?</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setPendingPayload(null)}>Review time</Button>
              <Button type="button" className="min-h-[44px]" onClick={() => { const payload = pendingPayload; setPendingPayload(null); void submitPayload(payload); }}>Create anyway</Button>
            </div>
          </div>
        </div>
      )}

      {recap && <SessionRecap recap={recap} onDismiss={() => setRecap(null)} onViewSchedule={handleViewSchedule} />}
    </div>
  );
}

const inputClass = 'min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className="mb-1.5 block text-xs font-semibold text-stone-700">{label}</span>{children}</label>;
}
