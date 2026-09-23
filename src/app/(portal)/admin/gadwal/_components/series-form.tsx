'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Save } from 'lucide-react';
import { Combobox, MultiCombobox } from '@/shared/components/combobox';
import { DatePicker } from '@/shared/components/date-picker';
import { TimePicker } from '@/shared/components/time-picker';
import { Button } from '@/shared/components/button';
import { formatAcademyDateInput } from '@/shared/utils/date-format';
import { addCalendarMonthsClamped, firstWeekdayOnOrAfter, formatCalendarDate, formatCalendarDateLabel, parseCalendarDate } from '@/shared/utils/calendar-date';
import type { PlatformPoliciesData } from '@/features/policies/server/policy-actions';
import type { RecurrenceScope, SessionSeriesInput } from '@/features/sessions/schemas';
import { createAdminSeries, previewAdminHistoricalSeries, updateAdminSeries } from '../actions';

interface FormPerson { id: string; name: string; email: string; }
interface PricingProfile { id: string; name: string; privateSessionPrice: string; groupSessionPrice: string; }
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
  pricingProfileId: string | null;
  participantIds: string[];
  nextOccurrence: { id: string } | null;
}

interface SeriesFormProps {
  mode: 'create' | 'edit';
  tutors: FormPerson[];
  students: FormPerson[];
  policy: PlatformPoliciesData;
  pricingProfiles: PricingProfile[];
  initialSeries?: InitialSeries;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inputClass = 'min-h-[44px] w-full rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

export function SeriesForm({ mode, tutors, students, policy, pricingProfiles, initialSeries }: SeriesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isPreviewPending, startPreviewTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState(initialSeries?.title || '');
  const [tutorId, setTutorId] = React.useState(initialSeries?.tutorId || tutors[0]?.id || '');
  const [sessionType, setSessionType] = React.useState<'PRIVATE' | 'GROUP'>(initialSeries?.sessionType || 'GROUP');
  const [participantIds, setParticipantIds] = React.useState(initialSeries?.participantIds || []);
  const [pricingProfileId, setPricingProfileId] = React.useState(initialSeries?.pricingProfileId || '');
  const [weekday, setWeekday] = React.useState(String(initialSeries?.weekday ?? 1));
  const [startTime, setStartTime] = React.useState(formatTimeInput(initialSeries?.startMinute ?? 17 * 60));
  const [duration, setDuration] = React.useState(String(initialSeries?.durationMinutes ?? 120));
  const [startsOn, setStartsOn] = React.useState(initialSeries?.startsOn.slice(0, 10) || formatAcademyDateInput());
  const [endsOn, setEndsOn] = React.useState(initialSeries?.endsOn?.slice(0, 10) || '');
  const [endDateManuallySet, setEndDateManuallySet] = React.useState(Boolean(initialSeries));
  const [endMonthCount, setEndMonthCount] = React.useState(0);
  const [scope, setScope] = React.useState<RecurrenceScope>('ENTIRE_SERIES');
  const [historicalEnabled, setHistoricalEnabled] = React.useState(false);
  const [historicalStartsOn, setHistoricalStartsOn] = React.useState('');
  const [preview, setPreview] = React.useState<{ key: string; dates: string[] } | null>(null);

  const effectiveEndsOn = endDateManuallySet ? endsOn : endMonthCount > 0 ? safeAddMonths(startsOn, endMonthCount) : '';
  const effectiveHistoryStart = historicalEnabled ? historicalStartsOn : '';
  const startMinute = parseTimeMinutes(startTime);
  const input: SessionSeriesInput = {
    title: title.trim(), tutorId, sessionType, participantIds,
    weekday: Number(weekday), startMinute, durationMinutes: Number(duration),
    startsOn, endsOn: effectiveEndsOn, pricingProfileId: pricingProfileId || null,
    historicalStartsOn: effectiveHistoryStart || null,
  };
  const previewKey = JSON.stringify({ ...input, participantIds: [...participantIds].sort() });
  const currentPreview = preview?.key === previewKey ? preview : null;

  const tutorOptions = tutors.map((person) => ({ value: person.id, label: person.name, sublabel: person.email }));
  const studentOptions = students.map((person) => ({ value: person.id, label: person.name, sublabel: person.email }));
  const typeOptions = [
    { value: 'PRIVATE', label: 'PRIVATE', sublabel: `${policy.privateSessionPrice.toFixed(2)} EGP · 1 student` },
    { value: 'GROUP', label: 'GROUP', sublabel: `${policy.groupSessionPrice.toFixed(2)} EGP · 1–4 students` },
  ];
  const pricingOptions = [
    { value: '', label: 'Platform pricing', sublabel: `${priceFor(sessionType, policy).toFixed(2)} EGP · resolved at finalization` },
    ...pricingProfiles.map((profile) => ({
      value: profile.id,
      label: profile.name,
      sublabel: `${sessionType === 'PRIVATE' ? profile.privateSessionPrice : profile.groupSessionPrice} EGP · resolved at finalization`,
    })),
  ];
  const firstOccurrence = startsOn && Number.isInteger(Number(weekday))
    ? formatCalendarDate(firstWeekdayOnOrAfter(parseCalendarDate(startsOn), Number(weekday)))
    : '';

  function buildInput() {
    if (!/^\d{2}:\d{2}$/.test(startTime) || startMinute < 0 || startMinute > 1439) {
      setError('Choose a valid start time.');
      return null;
    }
    if (!title.trim() || !tutorId || !startsOn || participantIds.length < 1 || (sessionType === 'PRIVATE' && participantIds.length !== 1)) {
      setError(sessionType === 'PRIVATE' ? 'Complete the schedule and assign exactly one student.' : 'Complete the schedule and assign at least one student.');
      return null;
    }
    if (historicalEnabled && !historicalStartsOn) {
      setError('Choose the first historical date to preview.');
      return null;
    }
    return input;
  }

  function previewHistory() {
    setError(null);
    const validInput = buildInput();
    if (!validInput) return;
    startPreviewTransition(async () => {
      try {
        const dates = await previewAdminHistoricalSeries(validInput, mode === 'edit' ? initialSeries?.id : undefined);
        setPreview({ key: JSON.stringify({ ...validInput, participantIds: [...participantIds].sort() }), dates });
      } catch (previewError) {
        setPreview(null);
        setError(previewError instanceof Error ? previewError.message : 'Unable to preview historical dates');
      }
    });
  }

  function submit() {
    setError(null);
    const validInput = buildInput();
    if (!validInput) return;
    if (historicalEnabled && !currentPreview) {
      setError('Preview the current schedule and confirm its dates before saving.');
      return;
    }
    const confirmedDates = historicalEnabled ? currentPreview?.dates : undefined;
    startTransition(async () => {
      try {
        if (mode === 'edit' && initialSeries) {
          await updateAdminSeries(initialSeries.id, validInput, scope, scope === 'ENTIRE_SERIES' ? undefined : initialSeries.nextOccurrence?.id, confirmedDates);
        } else {
          await createAdminSeries(validInput, confirmedDates);
        }
        router.push('/admin/gadwal');
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to save this weekly series');
      }
    });
  }

  function changeHistorical(enabled: boolean) {
    setHistoricalEnabled(enabled);
    setPreview(null);
    if (enabled && !historicalStartsOn && startsOn) {
      const today = parseCalendarDate(formatAcademyDateInput());
      const seriesStart = parseCalendarDate(startsOn);
      const cutoff = seriesStart < today ? seriesStart : today;
      setHistoricalStartsOn(formatCalendarDate(addCalendarMonthsClamped(cutoff, -1)));
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/admin/gadwal')} className="mb-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-primary"><ArrowLeft className="h-4 w-4" /> Back to Gadwal</button>
          <span className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Admin Console · Weekly recurrence</span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{mode === 'edit' ? 'Edit weekly series' : 'New weekly series'}</h1>
          <p className="mt-1 text-sm text-text-muted">The schedule is created once; concrete occurrences drive attendance and wallet history.</p>
        </div>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="min-w-0 space-y-6 rounded-2xl border border-border-subtle bg-canvas p-5 shadow-xs sm:p-7">
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          <label className="block min-w-0 md:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Series title</span><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="e.g. Robotics Lab · Mondays" /></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Tutor</span><Combobox options={tutorOptions} value={tutorId} onChange={setTutorId} placeholder="Select tutor" searchPlaceholder="Search tutors" required /></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Session type</span><Combobox options={typeOptions} value={sessionType} onChange={(value) => { const next = value as 'PRIVATE' | 'GROUP'; setSessionType(next); if (next === 'PRIVATE') setParticipantIds((current) => current.slice(0, 1)); }} placeholder="Select type" searchPlaceholder="Search types" required /></label>
          <label className="block min-w-0 md:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Pricing profile</span><Combobox options={pricingOptions} value={pricingProfileId} onChange={setPricingProfileId} placeholder="Choose pricing" searchPlaceholder="Search profiles" required disabled={mode === 'edit' && scope === 'THIS'} /><span className="mt-1 block text-xs text-text-muted">{mode === 'edit' && scope === 'THIS' ? 'A single occurrence keeps the series pricing profile.' : 'The selected profile or Platform pricing is resolved when each session is finalized.'}</span></label>
        </div>

        <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Normal Student roster · {sessionType === 'PRIVATE' ? 'exactly 1' : '1–4'} required</span><MultiCombobox options={studentOptions} values={participantIds} onChange={setParticipantIds} maxSelections={sessionType === 'PRIVATE' ? 1 : 4} name="participantIds" placeholder="Search and assign students" searchPlaceholder="Search by name or email" emptyMessage="No active Student accounts." /></label>

        <div className="grid min-w-0 gap-5 border-t border-border-subtle pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Weekday</span><Combobox options={WEEKDAYS.map((day, index) => ({ value: String(index), label: day }))} value={weekday} onChange={setWeekday} placeholder="Select weekday" searchPlaceholder="Search weekdays" required /></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Start time</span><TimePicker aria-label="Start time" value={startTime} onChange={setStartTime} clearable /></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Duration (minutes)</span><input type="number" min="30" max="480" step="30" value={duration} onChange={(event) => setDuration(event.target.value)} className={inputClass} /></label>
          <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Starts on</span><DatePicker aria-label="Starts on" value={startsOn} onChange={setStartsOn} clearable={false} /></label>
          <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-4">
            <span className="block text-xs font-semibold text-text-primary">Ends on <span className="font-normal text-text-subtle">(optional)</span></span>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="w-full min-w-0 lg:max-w-sm"><DatePicker aria-label="Ends on" value={effectiveEndsOn} onChange={(value) => { setEndDateManuallySet(true); setEndsOn(value); }} /></div>
              <Button type="button" variant="secondary" className="min-h-[44px] w-full lg:w-auto" onClick={() => {
                if (endDateManuallySet) { setEndDateManuallySet(false); setEndsOn(''); setEndMonthCount(1); }
                else setEndMonthCount((count) => count + 1);
              }}>+1 Month{!endDateManuallySet && endMonthCount > 0 ? ` · ${endMonthCount} total` : ''}</Button>
              <span className="text-xs text-text-muted">Each press adds one calendar month from Starts On. Clear the date to keep the series open-ended.</span>
            </div>
          </div>
          {firstOccurrence && <p className="text-sm text-text-muted sm:col-span-2 lg:col-span-4">The first session is the first {WEEKDAYS[Number(weekday)]} on or after Starts On: <strong className="font-semibold text-text-primary">{formatCalendarDateLabel(firstOccurrence)}</strong>. Starts On can be any calendar day.</p>}
        </div>

        <details className="border-t border-border-subtle pt-5">
          <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-text-primary">Advanced: pre-system historical schedule</summary>
          <section className="mt-3 space-y-3" aria-labelledby="historical-heading">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="historical-heading" className="text-sm font-semibold text-text-primary">Pre-system historical schedule</h2>
              <p className="mt-1 text-sm text-text-muted">Add dated history entries for Tutor history only. These entries stay outside attendance, upcoming schedules, wallets, and pay.</p>
            </div>
          </div>
          <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary">
            <input type="checkbox" checked={historicalEnabled} disabled={mode === 'edit' && scope !== 'ENTIRE_SERIES'} onChange={(event) => changeHistorical(event.target.checked)} className="h-4 w-4 accent-brand-primary" />
            Backfill sessions that occurred before this series started
          </label>
          {mode === 'edit' && scope !== 'ENTIRE_SERIES' && <p className="text-xs text-text-muted">Historical backfill is available only when editing the entire series.</p>}
          {historicalEnabled && <div className="space-y-3 rounded-xl border border-border-subtle bg-canvas-subtle p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-text-primary">First historical date</span><DatePicker aria-label="First historical date" value={historicalStartsOn} onChange={(value) => { setHistoricalStartsOn(value); setPreview(null); }} clearable={false} /></label>
              <Button type="button" variant="secondary" disabled={isPreviewPending} isLoading={isPreviewPending} onClick={previewHistory} className="min-h-[44px]">Preview dates</Button>
            </div>
            {currentPreview ? <div className="rounded-lg border border-border-subtle bg-canvas p-3" aria-live="polite">
              <p className="text-sm font-semibold text-text-primary">{currentPreview.dates.length} historical {currentPreview.dates.length === 1 ? 'session' : 'sessions'} to create</p>
              <p className="mt-1 text-xs text-text-muted">Dates use the academy calendar and selected weekday. Only dates before both Starts On and today are included; the preview expires if the schedule changes.</p>
              <ul className="mt-3 grid max-h-48 grid-cols-2 gap-1 overflow-y-auto text-xs text-text-primary sm:grid-cols-3" aria-label="Historical session dates">
                {currentPreview.dates.map((date) => <li key={date} className="rounded-md bg-canvas-subtle px-2 py-1.5">{formatCalendarDateLabel(date)}</li>)}
              </ul>
            </div> : preview && <p role="status" className="text-sm text-text-muted">Schedule changed. Preview again to confirm the updated dates.</p>}
          </div>}
          </section>
        </details>

        {mode === 'edit' && <label className="block min-w-0 border-t border-border-subtle pt-5"><span className="mb-1.5 block text-xs font-semibold text-text-primary">Edit scope</span><Combobox options={[{ value: 'THIS', label: 'This occurrence', sublabel: 'Only the selected next occurrence' }, { value: 'THIS_AND_FUTURE', label: 'This and future occurrences', sublabel: 'Keep earlier history unchanged' }, { value: 'ENTIRE_SERIES', label: 'Entire series', sublabel: 'Rewrite future occurrences; preserve history' }]} value={scope} onChange={(value) => { const next = value as RecurrenceScope; setScope(next); if (next !== 'ENTIRE_SERIES') changeHistorical(false); }} placeholder="Select edit scope" searchPlaceholder="Search edit scopes" required /></label>}
        {error && <p role="alert" className="rounded-lg border border-brand-border bg-brand-subtle px-3 py-2.5 text-sm font-medium text-brand-hover">{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => router.push('/admin/gadwal')}>Cancel</Button><Button type="submit" disabled={isPending} isLoading={isPending} className="min-h-[44px] gap-2"><Save className="h-4 w-4" /> {historicalEnabled && currentPreview ? `Confirm & save ${currentPreview.dates.length} historical ${currentPreview.dates.length === 1 ? 'session' : 'sessions'}` : mode === 'edit' ? 'Save series' : 'Create weekly series'}</Button></div>
      </form>
    </div>
  );
}

function formatTimeInput(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function parseTimeMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
}

function safeAddMonths(value: string, months: number) {
  try { return formatCalendarDate(addCalendarMonthsClamped(parseCalendarDate(value), months)); }
  catch { return ''; }
}

function priceFor(type: 'PRIVATE' | 'GROUP', policy: PlatformPoliciesData) {
  return type === 'PRIVATE' ? policy.privateSessionPrice : policy.groupSessionPrice;
}
