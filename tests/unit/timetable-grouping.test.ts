import { describe, expect, it } from 'vitest';
import { paginate } from '@/shared/utils/pagination';
import { formatSeriesSchedule, groupTimetableSessions } from '@/features/sessions/utils/timetable-groups';

function occurrence(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: 'Robotics Lab',
    sessionType: 'GROUP' as const,
    startTime: '2026-10-01T14:00:00.000Z',
    endTime: '2026-10-01T16:00:00.000Z',
    seriesId: null as string | null,
    ...overrides,
  };
}

describe('Tutor timetable recurring groups', () => {
  it('groups dated occurrences only by their durable SessionSeries identity', () => {
    const groups = groupTimetableSessions([
      occurrence('series-one-1', { seriesId: 'series-one', startTime: '2026-10-01T14:00:00.000Z' }),
      occurrence('series-one-2', { seriesId: 'series-one', startTime: '2026-10-08T14:00:00.000Z' }),
      occurrence('series-two-1', { seriesId: 'series-two', startTime: '2026-10-01T14:00:00.000Z' }),
      occurrence('standalone-one'),
      occurrence('standalone-two'),
    ]);

    expect(groups.map(({ id, sessions }) => [id, sessions.map(({ id: sessionId }) => sessionId)])).toEqual([
      ['series:series-one', ['series-one-1', 'series-one-2']],
      ['series:series-two', ['series-two-1']],
      ['session:standalone-one', ['standalone-one']],
      ['session:standalone-two', ['standalone-two']],
    ]);
  });

  it('shows the recurring schedule from the persisted series pattern', () => {
    const group = groupTimetableSessions([occurrence('session-1', {
      seriesId: 'series-1',
      seriesSchedule: { weekday: 4, startMinute: 1020, durationMinutes: 120 },
    })])[0];

    expect(formatSeriesSchedule(group)).toBe('Thursdays · 17:00–19:00');
  });

  it('paginates top-level series and standalone rows while keeping every child occurrence together', () => {
    const sessions = [
      occurrence('week-one', { seriesId: 'series-one' }),
      occurrence('week-two', { seriesId: 'series-one', startTime: '2026-10-08T14:00:00.000Z' }),
      ...Array.from({ length: 12 }, (_, index) => occurrence(`standalone-${index + 1}`, { seriesId: null, startTime: `2026-10-${String(index + 2).padStart(2, '0')}T14:00:00.000Z` })),
    ];
    const groups = groupTimetableSessions(sessions);
    const firstPage = paginate(groups, 1);
    const secondPage = paginate(groups, 2);

    expect(groups).toHaveLength(13);
    expect(firstPage.items[0].sessions).toHaveLength(2);
    expect(firstPage.items).toHaveLength(12);
    expect(secondPage.items).toHaveLength(1);
  });
});
