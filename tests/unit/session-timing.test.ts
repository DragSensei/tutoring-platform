import { describe, expect, it } from 'vitest';
import {
  classifySessionOccurrence,
  canPostponeSession,
  getUpcomingSessions,
  sortSessionOccurrences,
} from '@/shared/utils/session-timing';

const now = new Date('2026-09-26T10:00:00.000Z');
const occurrences = [
  { id: 'old-active', startTime: '2026-09-17T18:00:00.000Z', endTime: '2026-09-17T20:00:00.000Z', status: 'ACTIVE' },
  { id: 'future-later', startTime: '2026-10-20T12:00:00.000Z', endTime: '2026-10-20T14:00:00.000Z', status: 'COMPLETED' },
  { id: 'live', startTime: '2026-09-26T09:00:00.000Z', endTime: '2026-09-26T11:00:00.000Z', status: 'SCHEDULED' },
  { id: 'future-soon', startTime: '2026-09-27T12:00:00.000Z', endTime: '2026-09-27T14:00:00.000Z', status: 'SCHEDULED' },
  { id: 'future-mid', startTime: '2026-10-05T12:00:00.000Z', endTime: '2026-10-05T14:00:00.000Z', status: 'ACTIVE' },
  { id: 'old-scheduled', startTime: '2026-09-21T09:00:00.000Z', endTime: '2026-09-21T11:00:00.000Z', status: 'SCHEDULED' },
];

describe('concrete Session timetable classification', () => {
  it('classifies only by effective occurrence times, regardless of persisted status', () => {
    expect(classifySessionOccurrence('2026-09-27T10:00:00Z', '2026-09-27T11:00:00Z', now)).toBe('SCHEDULED');
    expect(classifySessionOccurrence('2026-09-26T09:00:00Z', '2026-09-26T11:00:00Z', now)).toBe('ACTIVE');
    expect(classifySessionOccurrence('2026-09-21T09:00:00Z', '2026-09-21T11:00:00Z', now)).toBe('COMPLETED');
    expect(classifySessionOccurrence('2026-09-21T09:00:00Z', '2026-09-21T11:00:00Z', now)).toBe('COMPLETED');
  });

  it('sorts future occurrences ascending and history newest first', () => {
    expect(sortSessionOccurrences(occurrences, 'SCHEDULED', now).map(({ id }) => id)).toEqual(['future-soon', 'future-mid', 'future-later']);
    expect(sortSessionOccurrences(occurrences, 'COMPLETED', now).map(({ id }) => id)).toEqual(['old-scheduled', 'old-active']);
  });

  it('uses a seven-day default horizon and supports 14, 30, and all upcoming', () => {
    expect(getUpcomingSessions(occurrences, undefined, now).map(({ id }) => id)).toEqual(['future-soon']);
    expect(getUpcomingSessions(occurrences, 14, now).map(({ id }) => id)).toEqual(['future-soon', 'future-mid']);
    expect(getUpcomingSessions(occurrences, 30, now).map(({ id }) => id)).toEqual(['future-soon', 'future-mid', 'future-later']);
    expect(getUpcomingSessions(occurrences, null, now).map(({ id }) => id)).toEqual(['future-soon', 'future-mid', 'future-later']);
  });

  it('allows postponement only while now is before the concrete start', () => {
    const start = new Date('2026-09-27T12:00:00.000Z');
    expect(canPostponeSession(start, now)).toBe(true);
    expect(canPostponeSession(start, start)).toBe(false);
    expect(canPostponeSession(start, new Date(start.getTime() + 1))).toBe(false);
  });
});
