'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, Edit3, XCircle } from 'lucide-react';
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
  THIS: 'Cancel only the next occurrence?',
  THIS_AND_FUTURE: 'Cancel this and all future occurrences?',
  ENTIRE_SERIES: 'Cancel this entire series and its future occurrences?',
};
const CANCELLATION_LABELS: Record<RecurrenceScope, string> = {
  THIS: 'Cancel occurrence',
  THIS_AND_FUTURE: 'Cancel future sessions',
  ENTIRE_SERIES: 'Cancel series',
};

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

  return (
    <>
    <Card className="overflow-hidden rounded-2xl border-stone-200/80 bg-white shadow-xs">
      <CardHeader className="border-b border-stone-100"><CardTitle className="text-lg">Weekly teaching assignments</CardTitle></CardHeader>
      {error && !confirmation && <p role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">{error}</p>}
      <CardContent className="p-0">
        <div className="divide-y divide-stone-100">
          {series.map((item) => (
            <article key={item.id} className="flex flex-col gap-4 px-4 py-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-stone-900">{item.title}</h3>
                  <Badge variant={item.status === 'ACTIVE' ? 'secondary' : 'outline'}>{item.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  {WEEKDAYS[item.weekday]} · {formatClock(item.startMinute)} · {Math.round(item.durationMinutes / 60 * 10) / 10}h · {item.sessionType}
                </p>
                <p className="mt-1 text-xs text-stone-500">Tutor: {item.tutorName} · Students: {item.assignedStudents.join(', ')}</p>
                <p className="mt-1 text-xs font-medium text-brand-primary">
                  {item.nextOccurrence ? `Next occurrence: ${new Date(item.nextOccurrence.startTime).toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short' })}` : 'No future occurrence materialized'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link href={`/admin/gadwal/series/${item.id}/edit`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                  <Edit3 className="h-4 w-4" aria-hidden="true" /> Edit series
                </Link>
                {item.status === 'ACTIVE' && <><Combobox options={[{ value: 'THIS', label: 'This occurrence' }, { value: 'THIS_AND_FUTURE', label: 'This and future' }, { value: 'ENTIRE_SERIES', label: 'Entire series' }]} value={scopes[item.id] || 'ENTIRE_SERIES'} onChange={(value) => setScopes((current) => ({ ...current, [item.id]: value as RecurrenceScope }))} placeholder="Cancel scope" searchPlaceholder="Search scopes" className="min-w-[190px]" /><button type="button" disabled={pendingId === item.id} onClick={() => requestCancellation(item)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle className="h-4 w-4" aria-hidden="true" /> {pendingId === item.id ? 'Cancelling…' : 'Cancel'}</button></>}
              </div>
            </article>
          ))}
        </div>
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
