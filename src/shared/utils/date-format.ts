/**
 * Deterministic date and time formatting utilities.
 * Guarantees 100% parity between Server-Side Rendering (SSR) and Client Hydration
 * by pinning the locale to 'en-GB' and the default academy timezone to 'Africa/Cairo'.
 */

export interface FormatDateTimeOptions {
  includeYear?: boolean;
  timeZone?: string;
}

export function formatDateTime(
  dateInput: Date | string | number,
  options?: FormatDateTimeOptions
): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const timeZone = options?.timeZone ?? 'Africa/Cairo';
  const includeYear = options?.includeYear ?? false;

  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatTime(
  dateInput: Date | string | number,
  options?: { timeZone?: string }
): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '--:--';

  const timeZone = options?.timeZone ?? 'Africa/Cairo';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatSessionSchedule(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Time unconfirmed';

  const cairoFormatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  const utcFormatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return `${cairoFormatted} Cairo (${utcFormatted} UTC)`;
}

export function formatAcademyDateInput(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    calendar: 'gregory',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
