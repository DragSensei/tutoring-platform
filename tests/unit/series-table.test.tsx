import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANCELLATION_SCOPE_OPTIONS, WeeklySeriesTable, type WeeklySeriesItem } from '@/features/sessions/components/series-table';

const item: WeeklySeriesItem = {
  id: 'series-1', title: 'Algebra', tutorId: 'tutor-1', tutorName: 'Omar', sessionType: 'GROUP',
  weekday: 1, startMinute: 1020, durationMinutes: 120, status: 'ACTIVE', assignedStudents: ['Mina'],
  nextOccurrence: { id: 'session-1', startTime: '2026-09-28T15:00:00.000Z', endTime: '2026-09-28T17:00:00.000Z', status: 'SCHEDULED' },
};

describe('Admin weekly series lifecycle presentation', () => {
  it('shows active schedules with edit and explicit cancel scope wording', () => {
    const html = renderToStaticMarkup(<WeeklySeriesTable series={[item]} onCancelSeries={vi.fn()} />);
    expect(html).toContain('Edit series');
    expect(html).toContain('End this recurring schedule');
    expect(html).not.toContain('No future occurrence materialized');
  });

  it('explains cancellation scopes and preserves past schedule history', () => {
    expect(CANCELLATION_SCOPE_OPTIONS.map(({ label }) => label)).toEqual([
      'Cancel only the next session', 'Cancel this and future sessions', 'End this recurring schedule',
    ]);
    expect(CANCELLATION_SCOPE_OPTIONS.every(({ sublabel }) => sublabel.includes('past') || sublabel.includes('history'))).toBe(true);
  });

  it('presents ended schedules as archived history without the active edit action', () => {
    const html = renderToStaticMarkup(<WeeklySeriesTable series={[{ ...item, status: 'ENDED', nextOccurrence: null }]} onCancelSeries={vi.fn()} />);
    expect(html).toContain('Ended and cancelled schedules');
    expect(html).toContain('/admin/gadwal/series/series-1/history');
    expect(html).toContain('View history');
    expect(html).not.toContain('Edit series');
    expect(html).not.toContain('No future occurrence materialized');
  });
});
