import { describe, expect, it } from 'vitest';
import { classifyAdminTimetableSession, groupAdminTimetableSessions } from '@/app/(portal)/admin/gadwal/_components/admin-timetable-utils';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const session = (id: string, startTime: string, endTime: string, status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' = 'SCHEDULED') => ({ id, startTime, endTime, status });

describe('Admin timetable categories', () => {
  it('classifies each Session into exactly one category with attention and cancellation precedence', () => {
    const sessions = [
      session('upcoming', '2026-10-01T14:00:00.000Z', '2026-10-01T15:00:00.000Z'),
      session('active', '2026-10-01T11:00:00.000Z', '2026-10-01T13:00:00.000Z'),
      session('attention', '2026-10-01T09:00:00.000Z', '2026-10-01T10:00:00.000Z'),
      session('completed', '2026-10-01T08:00:00.000Z', '2026-10-01T09:00:00.000Z'),
      session('cancelled', '2026-10-01T14:00:00.000Z', '2026-10-01T15:00:00.000Z', 'CANCELLED'),
    ];
    const groups = groupAdminTimetableSessions(sessions, new Set(['attention', 'cancelled']), NOW);
    expect(Object.values(groups).flat().map(({ id }) => id).sort()).toEqual(sessions.map(({ id }) => id).sort());
    expect(Object.values(groups).flat()).toHaveLength(sessions.length);
    expect(Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.map(({ id }) => id)]))).toEqual({
      UPCOMING: ['upcoming'], ACTIVE: ['active'], NEEDS_ATTENTION: ['attention'], COMPLETED: ['completed'], CANCELLED: ['cancelled'],
    });
  });

  it('uses inclusive Session start and exclusive Session end boundaries', () => {
    expect(classifyAdminTimetableSession(session('starts-now', NOW.toISOString(), '2026-10-01T13:00:00.000Z'), new Set(), NOW)).toBe('ACTIVE');
    expect(classifyAdminTimetableSession(session('ends-now', '2026-10-01T11:00:00.000Z', NOW.toISOString()), new Set(), NOW)).toBe('COMPLETED');
  });
});
