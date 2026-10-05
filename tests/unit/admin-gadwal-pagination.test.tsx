import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { WeeklySeriesItem } from '@/features/sessions/components/series-table';

const { findMany, occurrenceRead } = vi.hoisted(() => ({
  findMany: vi.fn(),
  occurrenceRead: vi.fn(),
}));

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    sessionSeries: { findMany },
    session: { findMany: occurrenceRead },
  },
}));

vi.mock('@/app/(portal)/admin/gadwal/actions', () => ({
  getAdminTimetableSessions: vi.fn(),
  getAdminUpcomingSeriesPage: vi.fn(),
}));

import { getAdminUpcomingSeriesPage as queryUpcomingSeriesPage } from '@/features/sessions/server/series-actions';
import { AdminTimetableCategories } from '@/app/(portal)/admin/gadwal/_components/admin-timetable-categories';
import { getAdminTimetableSessions } from '@/app/(portal)/admin/gadwal/actions';

const policy = { checkInWindowHours: 24, groupSessionPrice: 100, privateSessionPrice: 200 };
const baseDate = new Date('2026-09-29T15:00:00.000Z');

function storedSeries(index: number, startTime: Date) {
  const id = `series-${String(index).padStart(2, '0')}`;
  return {
    id,
    title: id,
    tutor_id: 'tutor-1',
    tutor: { id: 'tutor-1', name: 'Omar', email: null },
    session_type: 'GROUP',
    weekday: index % 7,
    start_minute: 1020,
    duration_minutes: 120,
    starts_on: new Date('2026-09-01T00:00:00.000Z'),
    ends_on: null,
    pricing_profile_id: null,
    pricing_profile: null,
    program_code: null,
    course_name: null,
    level: null,
    status: 'ACTIVE',
    participants: [],
    slots: [{ id: `slot-${id}`, weekday: index % 7, start_minute: 1020, duration_minutes: 120, timezone: 'Africa/Cairo' }],
    occurrences: [{ id: `occurrence-${id}`, start_time: startTime, end_time: new Date(startTime.getTime() + 7_200_000), status: 'SCHEDULED' }],
  };
}

const intensive: WeeklySeriesItem = {
  id: 'intensive-series', title: 'Robotics intensive', tutorId: 'tutor-1', tutorName: 'Omar', sessionType: 'GROUP',
  weekday: 6, startMinute: 1020, durationMinutes: 120,
  weeklySlots: [
    { weekday: 6, startMinute: 1020, durationMinutes: 120 },
    { weekday: 0, startMinute: 1020, durationMinutes: 120 },
    { weekday: 1, startMinute: 1020, durationMinutes: 120 },
  ],
  status: 'ACTIVE', assignedStudents: ['Mina'],
  nextOccurrence: { id: 'occurrence-1', startTime: '2026-10-03T15:00:00.000Z', endTime: '2026-10-03T17:00:00.000Z', status: 'SCHEDULED' },
};

describe('Admin Gadwal logical-group pagination', () => {
  it('renders a multi-day intensive series once with every weekly slot in the Upcoming view', () => {
    const html = renderToStaticMarkup(<AdminTimetableCategories upcoming={{ items: [intensive], totalCount: 1, page: 1, pageCount: 1, pageSize: 12 }} />);

    expect(html.match(/Robotics intensive/g)).toHaveLength(1);
    expect(html).toContain('Upcoming');
    expect(html).toContain('Intensive · 3 weekly slots');
    expect(html).toContain('Sat 5:00 PM–7:00 PM · Sun 5:00 PM–7:00 PM · Mon 5:00 PM–7:00 PM');
    expect(html).toContain('>1</span>');
    expect(getAdminTimetableSessions).not.toHaveBeenCalled();
  });

  it('sorts actual next dates globally before paging, with active-slot and stable ID tie ordering', async () => {
    const records = Array.from({ length: 25 }, (_, index) => {
      const dayOffset = index === 12 ? 11 : index;
      return storedSeries(index, new Date(baseDate.getTime() + dayOffset * 86_400_000));
    }).reverse();
    findMany.mockResolvedValue(records);
    const now = new Date('2026-09-29T00:00:00.000Z');

    const firstPage = await queryUpcomingSeriesPage(undefined, 1, policy, now);
    const secondPage = await queryUpcomingSeriesPage(undefined, 2, policy, now);
    const thirdPage = await queryUpcomingSeriesPage(undefined, 3, policy, now);
    const ordered = [...firstPage.items, ...secondPage.items, ...thirdPage.items];
    const tue = firstPage.items.find((item) => item.id === 'series-00')!;
    const sun = firstPage.items.find((item) => item.id === 'series-05')!;

    expect(tue.nextOccurrence!.startTime).toBe('2026-09-29T15:00:00.000Z');
    expect(sun.nextOccurrence!.startTime).toBe('2026-10-04T15:00:00.000Z');
    expect(Date.parse(tue.nextOccurrence!.startTime)).toBeLessThan(Date.parse(sun.nextOccurrence!.startTime));
    expect(ordered).toHaveLength(25);
    expect(ordered.every((item, index) => index === 0 || Date.parse(ordered[index - 1].nextOccurrence!.startTime) <= Date.parse(item.nextOccurrence!.startTime))).toBe(true);
    expect(firstPage.items[firstPage.items.length - 1].nextOccurrence!.startTime <= secondPage.items[0].nextOccurrence!.startTime).toBe(true);
    expect(firstPage).toMatchObject({ totalCount: 25, page: 1, pageCount: 3, pageSize: 12 });
    expect(firstPage.items[firstPage.items.length - 1]?.id).toBe('series-11');
    expect(secondPage.items[0].id).toBe('series-12');
    expect(firstPage.items[firstPage.items.length - 1]?.nextOccurrence?.startTime).toBe(secondPage.items[0].nextOccurrence?.startTime);
    expect(findMany.mock.calls[0][0].include.occurrences).toMatchObject({
      where: { series_slot: { is: { active: true } } },
      orderBy: { start_time: 'asc' },
      take: 1,
    });
    expect(occurrenceRead).not.toHaveBeenCalled();
  });
});
