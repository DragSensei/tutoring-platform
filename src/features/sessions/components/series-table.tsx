'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, Edit3, History, XCircle } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Combobox } from '@/shared/components/combobox';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import type { RecurrenceScope } from '@/features/sessions/schemas';

export interface WeeklySeriesItem {
  id: string;
  title: string;
  tutorId: string;
  tutorName: string;
  sessionType: 'PRIVATE' | 'GROUP';
  weekday: number;
  startMinute: number;
  durationMinutes: number;
  weeklySlots?: Array<{ weekday: number; startMinute: number; durationMinutes: number }>;
  programCode?: 'P1' | 'P3' | 'P4' | 'P5' | null;
  courseName?: string | null;
  level?: number | null;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  assignedStudents: string[];
  nextOccurrence: { id: string; startTime: string; endTime: string; status: string } | null;
}

interface WeeklySeriesTableProps {
  series: WeeklySeriesItem[];
  onCancelSeries: (seriesId: string, scope: RecurrenceScope, effectiveOccurrenceId?: string) => Promise<unknown>;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CANCELLATION_DESCRIPTIONS: Record<RecurrenceScope, string> = {
  THIS: 'Cancel only the next session. Other scheduled sessions and all past history stay unchanged.',
  THIS_AND_FUTURE: 'Cancel the next session and scheduled sessions after it. Past sessions and history stay unchanged.',
  ENTIRE_SERIES: 'End this recurring schedule and cancel its remaining future sessions. Past sessions and history stay unchanged.',
};
const CANCELLATION_LABELS: Record<RecurrenceScope, string> = {
  THIS: 'Cancel occurrence',
  THIS_AND_FUTURE: 'Cancel future sessions',
  ENTIRE_SERIES: 'End recurring schedule',
};
export const CANCELLATION_SCOPE_OPTIONS = [
  { value: 'THIS', label: 'Cancel only the next session', sublabel: 'Only this session is cancelled; all other schedule history stays unchanged.' },
  { value: 'THIS_AND_FUTURE', label: 'Cancel this and future sessions', sublabel: 'This and later sessions are cancelled; past sessions stay unchanged.' },
  { value: 'ENTIRE_SERIES', label: 'End this recurring schedule', sublabel: 'The schedule ends and remaining future sessions are cancelled; past history stays unchanged.' },
] satisfies Array<{ value: string; label: string; sublabel: string }>;

function formatClock(minute: number) {
  const hour = Math.floor(minute / 60);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute % 60).padStart(2, '0')} ${suffix}`;
}

export function WeeklySeriesTable({ series, onCancelSeries }: WeeklySeriesTableProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [scopes, setScopes] = React.useState<Record<string, RecurrenceScope>>({});
  const [confirmation, setConfirmation] = React.useState<{ item: WeeklySeriesItem; scope: RecurrenceScope; occurrenceId?: string } | null>(null);

  function requestCancellation(item: WeeklySeriesItem) {
    const scope = scopes[item.id] || 'ENTIRE_SERIES';
    const occurrenceId = scope === 'ENTIRE_SERIES' ? undefined : item.nextOccurrence?.id;
    if (!occurrenceId && scope !== 'ENTIRE_SERIES') {
      setError('No future occurrence is available for this cancellation scope.');
      return;
    }
    setError(null);
    setConfirmation({ item, scope, occurrenceId });
  }

  async function confirmCancellation() {
    if (!confirmation) return;
    setPendingId(confirmation.item.id);
    setError(null);
    try {
      await onCancelSeries(confirmation.item.id, confirmation.scope, confirmation.occurrenceId);
      setConfirmation(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to cancel this series');
    } finally {
      setPendingId(null);
    }
  }

  if (series.length === 0) {
    return (
      <Card className="rounded-2xl border-stone-200/80 bg-white shadow-xs">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="h-8 w-8 text-stone-400" aria-hidden="true" />
          <h2 className="mt-4 text-base font-semibold text-stone-900">No weekly series yet</h2>
          <p className="mt-1 max-w-md text-sm text-stone-500">Create one recurring assignment and future occurrences will be prepared automatically.</p>
        </CardContent>
      </Card>
    );
  }

  const renderSeries = (items: WeeklySeriesItem[]) => items.map((item) => (
    <article key={item.id} className="flex flex-col gap-4 px-4 py-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-stone-900">{item.title}</h3>
          <Badge variant={item.status === 'ACTIVE' ? 'secondary' : 'outline'}>{item.status.toLowerCase()}</Badge>
        </div>
        <p className="mt-1 text-sm text-stone-600">{item.programCode ? `${item.programCode}${item.courseName ? ` · ${item.courseName}` : ''}${item.level ? ` · L${item.level}` : ''} · ` : ''}{(item.weeklySlots?.length ?? 0) > 1 ? 'Intensive · ' : ''}{(item.weeklySlots?.length ? item.weeklySlots : [item]).map((slot) => `${WEEKDAYS[slot.weekday]} ${formatClock(slot.startMinute)}–${formatClock(slot.startMinute + slot.durationMinutes)}`).join(' · ')} · {item.sessionType}</p>
        <p className="mt-1 text-xs text-stone-500">Tutor: {item.tutorName} · Students: {item.assignedStudents.join(', ')}</p>
        <p className="mt-1 text-xs font-medium text-brand-primary">{item.nextOccurrence ? `Next session: ${new Date(item.nextOccurrence.startTime).toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short' })}` : item.status === 'ACTIVE' ? 'No upcoming session is currently scheduled' : 'No upcoming session'}</p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {item.status === 'ACTIVE' ? <>
          <Link href={`/admin/gadwal/series/${item.id}/edit`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"><Edit3 className="h-4 w-4" aria-hidden="true" /> Edit series</Link>
          <Combobox options={CANCELLATION_SCOPE_OPTIONS} value={scopes[item.id] || 'ENTIRE_SERIES'} onChange={(value) => setScopes((current) => ({ ...current, [item.id]: value as RecurrenceScope }))} placeholder="Cancellation scope" searchPlaceholder="Search scopes" className="min-w-[220px]" />
          <button type="button" disabled={pendingId === item.id} onClick={() => requestCancellation(item)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle className="h-4 w-4" aria-hidden="true" /> {pendingId === item.id ? 'Cancelling…' : 'Cancel'}</button>
        </> : <Link href={`/admin/gadwal/series/${item.id}/history`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"><History className="h-4 w-4" aria-hidden="true" /> View history</Link>}
      </div>
    </article>
  ));

  return (
    <>
    <Card className="overflow-hidden rounded-2xl border-stone-200/80 bg-white shadow-xs">
      <CardHeader className="border-b border-stone-100"><CardTitle className="text-lg">Weekly teaching assignments</CardTitle></CardHeader>
      {error && !confirmation && <p role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">{error}</p>}
      <CardContent className="p-0">
        <div className="divide-y divide-stone-100">{renderSeries(series)}</div>
      </CardContent>
    </Card>
    <ConfirmDialog
      open={Boolean(confirmation)}
      title="Cancel recurring sessions?"
      description={confirmation ? CANCELLATION_DESCRIPTIONS[confirmation.scope] : ''}
      confirmLabel={confirmation ? CANCELLATION_LABELS[confirmation.scope] : 'Confirm cancellation'}
      cancelLabel="Keep series"
      pending={Boolean(pendingId)}
      error={error}
      onCancel={() => { setConfirmation(null); setError(null); }}
      onConfirm={() => void confirmCancellation()}
    />
    </>
  );
}
