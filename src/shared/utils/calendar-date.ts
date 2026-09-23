function utcDate(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month, day);
  return date;
}

export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Use a valid calendar date');
  const date = utcDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (formatCalendarDate(date) !== value) throw new Error('Use a valid calendar date');
  return date;
}

export function formatCalendarDate(date: Date): string {
  return [date.getUTCFullYear().toString().padStart(4, '0'), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

export function addCalendarDays(date: Date, days: number): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
}

export function addCalendarMonthsClamped(date: Date, months: number): Date {
  const monthStart = utcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
  const lastDay = utcDate(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0).getUTCDate();
  return utcDate(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), Math.min(date.getUTCDate(), lastDay));
}

export function firstWeekdayOnOrAfter(date: Date, weekday: number): Date {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error('Use a valid weekday');
  return addCalendarDays(date, (weekday - date.getUTCDay() + 7) % 7);
}

export function calendarMonthGrid(month: Date): Date[] {
  const first = utcDate(month.getUTCFullYear(), month.getUTCMonth(), 1);
  const start = addCalendarDays(first, -first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index));
}

export function formatCalendarDateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseCalendarDate(value));
}
