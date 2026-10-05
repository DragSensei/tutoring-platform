import { describe, expect, it } from 'vitest';
import { sessionSeriesSchema } from '@/features/sessions/schemas';
import { planOccurrences } from '@/features/sessions/server/recurrence';
import { compactTimetablePreview, formatSeriesSchedule, groupTimetableSessions } from '@/features/sessions/utils/timetable-groups';
import { paginate } from '@/shared/utils/pagination';

const galalSlots = [
  { id: 'sat', weekday: 6, start_minute: 1140, duration_minutes: 120, timezone: 'Africa/Cairo' },
  { id: 'sun', weekday: 0, start_minute: 1140, duration_minutes: 120, timezone: 'Africa/Cairo' },
  { id: 'mon', weekday: 1, start_minute: 1140, duration_minutes: 120, timezone: 'Africa/Cairo' },
];
const baseInput = {
  title: 'P5 · Python · Galal', tutorId: 'yusuf', sessionType: 'GROUP' as const,
  participantIds: ['galal'], programCode: 'P5' as const, courseName: 'Python', level: null,
  weekday: 6, startMinute: 1140, durationMinutes: 120,
  startsOn: '2026-09-29', endsOn: '', pricingProfileId: null, historicalStartsOn: null,
};

describe('multi-day logical series', () => {
  it('accepts ordinary one-slot groups and rejects duplicate or overlapping times in one group', () => {
    expect(sessionSeriesSchema.safeParse(baseInput).success).toBe(true);
    expect(sessionSeriesSchema.safeParse({ ...baseInput, weeklySlots: [{ weekday: 6, startMinute: 1140, durationMinutes: 120 }] }).success).toBe(true);
    expect(sessionSeriesSchema.safeParse({ ...baseInput, weeklySlots: [{ weekday: 6, startMinute: 1140, durationMinutes: 120 }, { weekday: 6, startMinute: 1200, durationMinutes: 60 }] }).success).toBe(false);
    expect(sessionSeriesSchema.safeParse({ ...baseInput, programCode: 'P2' }).success).toBe(false);
  });

  it('plans Sat, Sun, Mon Cairo occurrences from one Galal series and three weekly slots', () => {
    const series = {
      id: 'galal-series', tutor_id: 'yusuf', title: baseInput.title, session_type: 'GROUP' as const,
      weekday: 6, start_minute: 1140, duration_minutes: 120,
      starts_on: new Date('2026-09-29T00:00:00.000Z'), ends_on: null, pricing_profile_id: null,
      status: 'ACTIVE' as const, participants: [{ student_id: 'galal' }], slots: galalSlots,
    };
    const occurrences = planOccurrences(series, new Date('2026-09-29T12:00:00.000Z'));
    expect(series.slots).toHaveLength(3);
    expect(occurrences.length).toBeGreaterThan(30);
    expect(new Set(occurrences.map(({ slot, occurrenceDate }) => `${slot.id}:${occurrenceDate.toISOString()}`)).size).toBe(occurrences.length);
    expect(new Set(occurrences.map(({ slot }) => slot.id))).toEqual(new Set(['sat', 'sun', 'mon']));
    const cairoClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    expect(occurrences.every(({ start, end }) => cairoClock.format(start) === '19:00' && cairoClock.format(end) === '21:00')).toBe(true);
    expect(planOccurrences({ ...series, slots: galalSlots.slice(0, 1) }, new Date('2026-09-29T12:00:00.000Z')).length).toBeLessThan(occurrences.length);
  });

  it('groups and paginates all intensive occurrences as one cohort while keeping same-time groups separate', () => {
    const schedules = galalSlots.map((slot) => ({ weekday: slot.weekday, startMinute: slot.start_minute, durationMinutes: slot.duration_minutes }));
    const sessions = [
      ...['2026-10-03T16:00:00.000Z', '2026-10-04T16:00:00.000Z', '2026-10-05T16:00:00.000Z'].map((startTime, index) => ({ id: `galal-${index}`, title: 'Galal', sessionType: 'GROUP' as const, seriesId: 'galal', startTime, endTime: new Date(Date.parse(startTime) + 7_200_000).toISOString(), seriesSchedules: schedules })),
      { id: 'other', title: 'Different cohort', sessionType: 'GROUP' as const, seriesId: 'other', startTime: '2026-10-03T16:00:00.000Z', endTime: '2026-10-03T18:00:00.000Z' },
    ];
    const groups = groupTimetableSessions(sessions);
    expect(groups).toHaveLength(2);
    expect(groups[0].sessions).toHaveLength(3);
    expect(formatSeriesSchedule(groups[0])).toBe('Intensive · Sun 19:00–21:00 · Mon 19:00–21:00 · Sat 19:00–21:00');
    expect(paginate(groups, 1).items).toHaveLength(2);
    expect(compactTimetablePreview(sessions).map((session) => session.id)).toEqual(['galal-0', 'other']);
  });
});
