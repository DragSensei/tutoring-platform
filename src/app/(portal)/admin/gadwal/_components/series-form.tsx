'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Combobox, MultiCombobox } from '@/shared/components/combobox';
import { Button } from '@/shared/components/button';
import { formatAcademyDateInput } from '@/shared/utils/date-format';
import type { PlatformPoliciesData } from '@/features/policies/server/policy-actions';
import type { RecurrenceScope, SessionSeriesInput } from '@/features/sessions/schemas';
import { createAdminSeries, updateAdminSeries } from '../actions';

interface FormPerson { id: string; name: string; email: string; }
interface InitialSeries {
  id: string;
  title: string;
  tutorId: string;
  sessionType: 'PRIVATE' | 'GROUP';
  weekday: number;
  startMinute: number;
  durationMinutes: number;
  startsOn: string;
  endsOn: string | null;
  participantIds: string[];
  nextOccurrence: { id: string } | null;
}

interface SeriesFormProps {
  mode: 'create' | 'edit';
  tutors: FormPerson[];
  students: FormPerson[];
  policy: PlatformPoliciesData;
  initialSeries?: InitialSeries;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inputClass = 'min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

export function SeriesForm({ mode, tutors, students, policy, initialSeries }: SeriesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState(initialSeries?.title || '');
  const [tutorId, setTutorId] = React.useState(initialSeries?.tutorId || tutors[0]?.id || '');
  const [sessionType, setSessionType] = React.useState<'PRIVATE' | 'GROUP'>(initialSeries?.sessionType || 'GROUP');
  const [participantIds, setParticipantIds] = React.useState(initialSeries?.participantIds || []);
  const [weekday, setWeekday] = React.useState(String(initialSeries?.weekday ?? 1));
  const [startTime, setStartTime] = React.useState(formatTimeInput(initialSeries?.startMinute ?? 17 * 60));
  const [duration, setDuration] = React.useState(String(initialSeries?.durationMinutes ?? 120));
  const [startsOn, setStartsOn] = React.useState(initialSeries?.startsOn.slice(0, 10) || formatAcademyDateInput());
  const [endsOn, setEndsOn] = React.useState(initialSeries?.endsOn?.slice(0, 10) || '');
  const [scope, setScope] = React.useState<RecurrenceScope>('ENTIRE_SERIES');

  const tutorOptions = tutors.map((person) => ({ value: person.id, label: person.name, sublabel: person.email }));
  const studentOptions = students.map((person) => ({ value: person.id, label: person.name, sublabel: person.email }));
  const typeOptions = [
    { value: 'PRIVATE', label: 'PRIVATE', sublabel: `${policy.privateSessionPrice.toFixed(2)} EGP · 1 student` },
    { value: 'GROUP', label: 'GROUP', sublabel: `${policy.groupSessionPrice.toFixed(2)} EGP · 1–4 students` },
  ];

  function submit() {
    setError(null);
    const [hour, minute] = startTime.split(':').map(Number);
    const input: SessionSeriesInput = {
      title: title.trim(), tutorId, sessionType, participantIds,
      weekday: Number(weekday), startMinute: hour * 60 + minute,
      durationMinutes: Number(duration), startsOn, endsOn,
    };
    if (!input.title || !input.tutorId || !input.startsOn || participantIds.length < 1 || (sessionType === 'PRIVATE' && participantIds.length !== 1)) {
      setError(sessionType === 'PRIVATE' ? 'Complete the schedule and assign exactly one student.' : 'Complete the schedule and assign at least one student.');
      return;
    }
    startTransition(async () => {
      try {
        if (mode === 'edit' && initialSeries) {
          await updateAdminSeries(initialSeries.id, input, scope, scope === 'ENTIRE_SERIES' ? undefined : initialSeries.nextOccurrence?.id);
        } else {
          await createAdminSeries(input);
        }
        router.push('/admin/gadwal');
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to save this weekly series');
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-stone-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><button type="button" onClick={() => router.push('/admin/gadwal')} className="mb-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-900"><ArrowLeft className="h-4 w-4" /> Back to Gadwal</button><span className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Admin Console · Weekly recurrence</span><h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{mode === 'edit' ? 'Edit weekly series' : 'New weekly series'}</h1><p className="mt-1 text-sm text-stone-500">The schedule is created once; concrete occurrences drive attendance and wallet history.</p></div>
      </header>

      <form action={() => submit()} className="min-w-0 space-y-6 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:p-7">
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          <label className="block min-w-0 md:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Series title</span><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="e.g. Robotics Lab · Mondays" /></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Tutor</span><Combobox options={tutorOptions} value={tutorId} onChange={setTutorId} placeholder="Select tutor" searchPlaceholder="Search tutors" required /></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Session type</span><Combobox options={typeOptions} value={sessionType} onChange={(value) => { const next = value as 'PRIVATE' | 'GROUP'; setSessionType(next); if (next === 'PRIVATE') setParticipantIds((current) => current.slice(0, 1)); }} placeholder="Select type" searchPlaceholder="Search types" required /></label>
        </div>

        <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Normal Student roster · {sessionType === 'PRIVATE' ? 'exactly 1' : '1–4'} required</span><MultiCombobox options={studentOptions} values={participantIds} onChange={setParticipantIds} maxSelections={sessionType === 'PRIVATE' ? 1 : 4} name="participantIds" placeholder="Search and assign students" searchPlaceholder="Search by name or email" emptyMessage="No active Student accounts." /></label>

        <div className="grid min-w-0 gap-5 border-t border-stone-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Weekday</span><Combobox options={WEEKDAYS.map((day, index) => ({ value: String(index), label: day }))} value={weekday} onChange={setWeekday} placeholder="Select weekday" searchPlaceholder="Search weekdays" required /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Start time</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Duration (minutes)</span><input type="number" min="30" max="480" step="30" value={duration} onChange={(event) => setDuration(event.target.value)} className={inputClass} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Starts on</span><input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={inputClass} /></label>
          <label className="block min-w-0 sm:col-span-2 lg:col-span-4"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Ends on <span className="font-normal text-stone-400">(optional)</span></span><input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className={inputClass} /></label>
        </div>

        {mode === 'edit' && <label className="block min-w-0 border-t border-stone-100 pt-5"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Edit scope</span><Combobox options={[{ value: 'THIS', label: 'This occurrence', sublabel: 'Only the selected next occurrence' }, { value: 'THIS_AND_FUTURE', label: 'This and future occurrences', sublabel: 'Keep earlier history unchanged' }, { value: 'ENTIRE_SERIES', label: 'Entire series', sublabel: 'Rewrite future occurrences; preserve history' }]} value={scope} onChange={(value) => setScope(value as RecurrenceScope)} placeholder="Select edit scope" searchPlaceholder="Search edit scopes" required /></label>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800">{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => router.push('/admin/gadwal')}>Cancel</Button><Button type="submit" disabled={isPending} isLoading={isPending} className="min-h-[44px] gap-2"><Save className="h-4 w-4" /> {mode === 'edit' ? 'Save series' : 'Create weekly series'}</Button></div>
      </form>
    </div>
  );
}

function formatTimeInput(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
