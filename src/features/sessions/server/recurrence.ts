import type { Prisma, PrismaClient } from '@prisma/client';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';
import { addCalendarDays, addCalendarMonthsClamped, parseCalendarDate } from '@/shared/utils/calendar-date';
import { prisma } from '@/shared/lib/prisma';

export { addCalendarDays, parseCalendarDate } from '@/shared/utils/calendar-date';

export const ACADEMY_TIME_ZONE = 'Africa/Cairo';
// ponytail: twelve weeks keeps reads bounded; add a scheduler only when request-time materialization is insufficient.
export const RECURRENCE_HORIZON_WEEKS = 12;
export const MAX_HISTORICAL_BACKFILL_MONTHS = 12;

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export interface RecurrencePolicy {
  checkInWindowHours: number;
}

export interface SeriesMaterializationInput {
  id: string;
  tutor_id: string;
  title: string;
  session_type: 'PRIVATE' | 'GROUP';
  weekday: number;
  start_minute: number;
  duration_minutes: number;
  starts_on: Date;
  ends_on: Date | null;
  pricing_profile_id: string | null;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  participants: Array<{ student_id: string }>;
}

const calendarFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ACADEMY_TIME_ZONE,
  calendar: 'gregory',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getCalendarParts(input: Date) {
  const parts = Object.fromEntries(
    calendarFormatter.formatToParts(input).map(({ type, value }) => [type, Number(value)])
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function academyCalendarDate(input = new Date()): Date {
  const parts = getCalendarParts(input);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function academyOffsetAt(naiveUtc: Date): number {
  const parts = getCalendarParts(naiveUtc);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - naiveUtc.getTime();
}

export function academyDateTime(date: Date, startMinute: number): Date {
  const naiveUtc = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    Math.floor(startMinute / 60),
    startMinute % 60,
  ));
  return new Date(naiveUtc.getTime() - academyOffsetAt(naiveUtc));
}

export function occurrenceDates(
  series: Pick<SeriesMaterializationInput, 'weekday' | 'starts_on' | 'ends_on' | 'status'>,
  now = new Date(),
): Date[] {
  if (series.status !== 'ACTIVE') return [];

  const today = academyCalendarDate(now);
  const horizonEnd = addCalendarDays(today, RECURRENCE_HORIZON_WEEKS * 7);
  let cursor = series.starts_on > today ? academyCalendarDate(series.starts_on) : today;
  const seriesEnd = series.ends_on ? academyCalendarDate(series.ends_on) : horizonEnd;
  const end = seriesEnd < horizonEnd ? seriesEnd : horizonEnd;
  const dates: Date[] = [];

  while (cursor <= end) {
    if (cursor.getUTCDay() === series.weekday) dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

export function historicalOccurrenceDates(
  series: Pick<SeriesMaterializationInput, 'weekday' | 'starts_on'>,
  historicalStartsOn: string,
  now = new Date(),
): Date[] {
  if (!Number.isInteger(series.weekday) || series.weekday < 0 || series.weekday > 6) {
    throw new Error('Use a valid series weekday');
  }

  const startsOn = academyCalendarDate(series.starts_on);
  const today = academyCalendarDate(now);
  const cutoff = startsOn < today ? startsOn : today;
  const historyStart = parseCalendarDate(historicalStartsOn);
  const earliestAllowed = addCalendarMonthsClamped(cutoff, -MAX_HISTORICAL_BACKFILL_MONTHS);
  if (historyStart >= startsOn) throw new Error('Historical dates must be before the series starts on date');
  if (historyStart >= today) throw new Error('Historical dates must be before today');
  if (historyStart < earliestAllowed) throw new Error('Historical backfill is limited to 12 calendar months');

  const dates: Date[] = [];
  for (let cursor = historyStart; cursor < cutoff; cursor = addCalendarDays(cursor, 1)) {
    if (cursor.getUTCDay() === series.weekday) dates.push(cursor);
  }
  if (dates.length > 54) throw new Error('Historical backfill exceeds the occurrence limit');
  return dates;
}

async function materializeOne(
  db: DatabaseClient,
  series: SeriesMaterializationInput,
  policy: RecurrencePolicy,
  now: Date,
) {
  const dates = occurrenceDates(series, now);
  if (dates.length === 0) return 0;

  await db.session.createMany({
    data: dates.map((occurrenceDate) => {
      const start = academyDateTime(occurrenceDate, series.start_minute);
      const end = new Date(start.getTime() + series.duration_minutes * 60_000);
      return {
        series_id: series.id,
        occurrence_date: occurrenceDate,
        tutor_id: series.tutor_id,
        title: series.title,
        session_type: series.session_type,
        pricing_profile_id: series.pricing_profile_id,
        start_time: start,
        end_time: end,
        deadline: computeAttendanceClosesAt(end, policy.checkInWindowHours),
        status: 'SCHEDULED' as const,
      };
    }),
    skipDuplicates: true,
  });

  const occurrences = await db.session.findMany({
    where: {
      series_id: series.id,
      occurrence_date: { in: dates },
      series_exception: false,
      historical_only: false,
    },
    select: { id: true },
  });

  if (series.participants.length > 0 && occurrences.length > 0) {
    await db.sessionParticipant.createMany({
      data: occurrences.flatMap((occurrence) => series.participants.map((participant) => ({
        session_id: occurrence.id,
        student_id: participant.student_id,
      }))),
      skipDuplicates: true,
    });
  }

  return dates.length;
}

async function getActiveSeries(db: DatabaseClient, where: Prisma.SessionSeriesWhereUniqueInput) {
  return db.sessionSeries.findUnique({
    where,
    include: { participants: { select: { student_id: true } } },
  });
}

function toMaterializationInput(series: Awaited<ReturnType<typeof getActiveSeries>>) {
  if (!series) return null;
  return series as SeriesMaterializationInput;
}

export async function materializeSessionSeries(seriesId: string, policy: RecurrencePolicy, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const series = toMaterializationInput(await getActiveSeries(tx, { id: seriesId }));
    if (!series) throw new Error('Session series not found');
    const today = academyCalendarDate(now);
    if (series.status === 'ACTIVE' && series.ends_on && academyCalendarDate(series.ends_on) < today) {
      await tx.sessionSeries.updateMany({ where: { id: series.id, status: 'ACTIVE' }, data: { status: 'ENDED' } });
      return 0;
    }
    return materializeOne(tx, series, policy, now);
  });
}

export async function materializeActiveSeriesForTutor(tutorId: string, policy: RecurrencePolicy, now = new Date()) {
  const db = prisma;
  const series = await db.sessionSeries.findMany({
    where: { tutor_id: tutorId, status: 'ACTIVE' },
    select: { id: true },
  });
  let count = 0;
  for (const item of series) count += await materializeSessionSeries(item.id, policy, now);
  return count;
}

export async function materializeActiveSeriesForStudent(studentId: string, policy: RecurrencePolicy, now = new Date()) {
  const db = prisma;
  const series = await db.sessionSeries.findMany({
    where: { status: 'ACTIVE', participants: { some: { student_id: studentId } } },
    select: { id: true },
  });
  let count = 0;
  for (const item of series) count += await materializeSessionSeries(item.id, policy, now);
  return count;
}

export async function materializeAllActiveSeries(policy: RecurrencePolicy, now = new Date()) {
  const db = prisma;
  const series = await db.sessionSeries.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });
  let count = 0;
  for (const item of series) count += await materializeSessionSeries(item.id, policy, now);
  return count;
}
