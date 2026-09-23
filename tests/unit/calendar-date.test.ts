import { describe, expect, it } from 'vitest';
import { addCalendarMonthsClamped, firstWeekdayOnOrAfter, formatCalendarDate, parseCalendarDate } from '@/shared/utils/calendar-date';
import { academyCalendarDate, academyDateTime, historicalOccurrenceDates, occurrenceDates } from '@/features/sessions/server/recurrence';

describe('calendar date helpers', () => {
  it('clamps month arithmetic at the target month end and handles leap years', () => {
    expect(formatCalendarDate(addCalendarMonthsClamped(parseCalendarDate('2024-01-31'), 1))).toBe('2024-02-29');
    expect(formatCalendarDate(addCalendarMonthsClamped(parseCalendarDate('2025-03-31'), -1))).toBe('2025-02-28');
  });

  it('finds the first matching weekday on or after a date boundary', () => {
    expect(formatCalendarDate(firstWeekdayOnOrAfter(parseCalendarDate('2026-09-23'), 1))).toBe('2026-09-28');
    expect(formatCalendarDate(firstWeekdayOnOrAfter(parseCalendarDate('2026-09-28'), 1))).toBe('2026-09-28');
  });

  it('starts recurrence on the first selected weekday on or after Starts On', () => {
    const dates = occurrenceDates({
      weekday: 1,
      starts_on: parseCalendarDate('2026-09-23'),
      ends_on: null,
      status: 'ACTIVE',
    }, new Date('2026-09-20T12:00:00.000Z'));
    expect(formatCalendarDate(dates[0])).toBe('2026-09-28');
  });

  it('keeps historical occurrences before both the series boundary and Cairo today', () => {
    const now = new Date('2026-03-10T12:00:00.000Z');
    const dates = historicalOccurrenceDates(
      { weekday: 2, starts_on: parseCalendarDate('2026-05-20') },
      '2026-02-10',
      now,
    );
    expect(dates.map(formatCalendarDate)).toEqual(['2026-02-10', '2026-02-17', '2026-02-24', '2026-03-03']);
  });

  it('bounds history to 12 calendar months and rejects today or future start dates', () => {
    const series = { weekday: 1, starts_on: parseCalendarDate('2026-05-20') };
    const now = new Date('2026-03-10T12:00:00.000Z');
    expect(() => historicalOccurrenceDates(series, '2025-03-09', now)).toThrow('12 calendar months');
    expect(() => historicalOccurrenceDates(series, '2026-03-10', now)).toThrow('before today');
  });

  it('materializes selected Cairo wall time on the requested calendar date', () => {
    const start = academyDateTime(parseCalendarDate('2026-07-06'), 9 * 60);
    const cairoParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(start);
    const parts = Object.fromEntries(cairoParts.map(({ type, value }) => [type, value]));
    expect(`${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`).toBe('2026-07-06 09:00');
    expect(formatCalendarDate(academyCalendarDate(start))).toBe('2026-07-06');
  });
});
