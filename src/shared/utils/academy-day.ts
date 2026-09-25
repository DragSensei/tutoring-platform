import { parseCalendarDate } from '@/shared/utils/calendar-date';

const cairoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo', calendar: 'gregory', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function startOfCairoDay(value: string): Date {
  const parsed = parseCalendarDate(value);
  const approximate = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  const localDate = (instant: Date) => {
    const parts = Object.fromEntries(cairoDateFormatter.formatToParts(instant).map(({ type, value: part }) => [type, part]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  let low = approximate - 36 * 60 * 60 * 1000;
  let high = approximate + 36 * 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDate(new Date(middle)) >= value) high = middle;
    else low = middle;
  }
  const boundary = new Date(high);
  if (localDate(boundary) !== value) throw new Error('Unable to resolve academy calendar date');
  return boundary;
}
