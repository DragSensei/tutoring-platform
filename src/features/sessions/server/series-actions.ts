import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { parseCalendarDate, academyCalendarDate, academyDateTime, historicalOccurrenceDates, materializeActiveSeriesForStudent, materializeActiveSeriesForTutor, materializeAllActiveSeries, materializeSessionSeries } from './recurrence';
import { formatCalendarDate } from '@/shared/utils/calendar-date';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';
import { createSessionSchema, recurrenceScopeSchema, sessionSeriesSchema, type RecurrenceScope, type SessionSeriesInput } from '../schemas';
import { updateSession } from './session-actions';

export interface SeriesPricingPolicy {
  checkInWindowHours: number;
  groupSessionPrice: number;
  privateSessionPrice: number;
}

export interface SeriesScheduleFilter {
  tutorId?: string;
  studentId?: string;
}

const SERIES_INCLUDE = {
  tutor: { select: { id: true, name: true, email: true } },
  pricing_profile: { select: { id: true, name: true, private_session_price: true, group_session_price: true } },
  participants: { include: { student: { select: { id: true, name: true, email: true } } } },
} as const;

function requiredProfile(value: string | null, label: string) {
  if (!value) throw new Error(`${label} profile is incomplete`);
  return value;
}

function priceFor(type: 'PRIVATE' | 'GROUP', policy: SeriesPricingPolicy) {
  return type === 'PRIVATE' ? policy.privateSessionPrice : policy.groupSessionPrice;
}

function parseSeriesInput(input: SessionSeriesInput) {
  const parsed = sessionSeriesSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid recurring schedule');
  return {
    ...parsed.data,
    startsOn: parseCalendarDate(parsed.data.startsOn),
    endsOn: parsed.data.endsOn ? parseCalendarDate(parsed.data.endsOn) : null,
    historicalStartsOn: parsed.data.historicalStartsOn ? parseCalendarDate(parsed.data.historicalStartsOn) : null,
    participantIds: [...new Set(parsed.data.participantIds)],
  };
}

export async function previewHistoricalSeries(input: SessionSeriesInput, seriesId?: string, now = new Date()) {
  const validInput = parseSeriesInput(input);
  if (!validInput.historicalStartsOn) return [];
  const candidateDates = historicalOccurrenceDates(
    { weekday: validInput.weekday, starts_on: validInput.startsOn },
    formatCalendarDate(validInput.historicalStartsOn),
    now,
  );
  if (!seriesId || candidateDates.length === 0) return candidateDates.map(formatCalendarDate);
  const existing = await prisma.session.findMany({
    where: { series_id: seriesId, occurrence_date: { in: candidateDates } },
    select: { occurrence_date: true },
  });
  const existingKeys = new Set(existing.flatMap(({ occurrence_date }) => occurrence_date ? [formatCalendarDate(occurrence_date)] : []));
  return candidateDates.map(formatCalendarDate).filter((date) => !existingKeys.has(date));
}

function confirmedHistoricalDates(
  input: ReturnType<typeof parseSeriesInput>,
  confirmedDates: string[] | undefined,
  now: Date,
  existingDates: Set<string> = new Set(),
) {
  if (!input.historicalStartsOn) {
    if (confirmedDates?.length) throw new Error('Remove the historical preview before saving this series');
    return [];
  }
  if (!confirmedDates) throw new Error('Preview and confirm historical sessions before saving');
  const expected = historicalOccurrenceDates(
    { weekday: input.weekday, starts_on: input.startsOn },
    formatCalendarDate(input.historicalStartsOn),
    now,
  ).map(formatCalendarDate).filter((date) => !existingDates.has(date));
  if (expected.length !== confirmedDates.length || expected.some((date, index) => date !== confirmedDates[index])) {
    throw new Error('The historical preview has expired or the schedule changed. Preview it again before saving.');
  }
  return expected.map(parseCalendarDate);
}

async function validateSeriesReferences(
  db: typeof prisma | Prisma.TransactionClient,
  input: { tutorId: string; participantIds: string[]; pricingProfileId: string | null },
) {
  const [tutor, students, pricingProfile] = await Promise.all([
    db.user.findUnique({ where: { id: input.tutorId }, select: { id: true, role: true, account_status: true, name: true } }),
    db.user.findMany({
      where: { id: { in: input.participantIds }, role: 'STUDENT', account_status: 'ACTIVE' },
      select: { id: true, name: true },
    }),
    input.pricingProfileId
      ? db.pricingProfile.findFirst({ where: { id: input.pricingProfileId, is_active: true }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (!tutor || tutor.role !== 'TUTOR' || tutor.account_status !== 'ACTIVE' || !tutor.name) {
    throw new Error('A complete active Tutor account is required');
  }
  if (students.length !== input.participantIds.length || students.some((student) => !student.name)) {
    throw new Error('Every assigned participant must be an active Student with a complete profile');
  }
  if (input.pricingProfileId && !pricingProfile) throw new Error('Select an active pricing profile');
}

interface HistoricalSeriesInput {
  id: string;
  tutor_id: string;
  title: string;
  session_type: 'PRIVATE' | 'GROUP';
  weekday: number;
  start_minute: number;
  duration_minutes: number;
  starts_on: Date;
  pricing_profile_id: string | null;
  participants: Array<{ student_id: string }>;
}

async function materializeHistoricalOccurrences(
  tx: Prisma.TransactionClient,
  series: HistoricalSeriesInput,
  dates: Date[],
  policy: SeriesPricingPolicy,
) {
  if (dates.length === 0) return 0;

  await tx.session.createMany({
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
        historical_only: true,
      };
    }),
    skipDuplicates: true,
  });

  const occurrences = await tx.session.findMany({
    where: { series_id: series.id, occurrence_date: { in: dates }, historical_only: true },
    select: { id: true },
  });
  if (series.participants.length > 0 && occurrences.length > 0) {
    await tx.sessionParticipant.createMany({
      data: occurrences.flatMap(({ id }) => series.participants.map(({ student_id }) => ({ session_id: id, student_id }))),
      skipDuplicates: true,
    });
  }
  return dates.length;
}

function serializeSeries(
  series: Awaited<ReturnType<typeof prisma.sessionSeries.findUniqueOrThrow>> & {
    tutor: { id: string; name: string | null; email: string | null };
    pricing_profile: { id: string; name: string; private_session_price: Prisma.Decimal; group_session_price: Prisma.Decimal } | null;
    participants: Array<{ student: { id: string; name: string | null; email: string | null } }>;
    occurrences?: Array<{ id: string; start_time: Date; end_time: Date; status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' }>;
  },
  policy: SeriesPricingPolicy,
) {
  const next = series.occurrences?.[0] || null;
  return {
    id: series.id,
    title: series.title,
    tutorId: series.tutor_id,
    tutorName: requiredProfile(series.tutor.name, 'Tutor'),
    tutorEmail: series.tutor.email,
    sessionType: series.session_type,
    weekday: series.weekday,
    startMinute: series.start_minute,
    durationMinutes: series.duration_minutes,
    startsOn: series.starts_on.toISOString(),
    endsOn: series.ends_on?.toISOString() || null,
    pricingProfileId: series.pricing_profile_id,
    pricingProfileName: series.pricing_profile?.name || null,
    status: series.status,
    assignedStudents: series.participants.map(({ student }) => requiredProfile(student.name, 'Student')),
    participantIds: series.participants.map(({ student }) => student.id),
    price: series.pricing_profile
      ? Number(series.session_type === 'PRIVATE' ? series.pricing_profile.private_session_price : series.pricing_profile.group_session_price)
      : priceFor(series.session_type, policy),
    nextOccurrence: next
      ? { id: next.id, startTime: next.start_time.toISOString(), endTime: next.end_time.toISOString(), status: next.status }
      : null,
  };
}

export async function createSessionSeries(
  input: SessionSeriesInput,
  policy: SeriesPricingPolicy,
  confirmedDates?: string[],
) {
  const validInput = parseSeriesInput(input);
  const now = new Date();
  const historyDates = confirmedHistoricalDates(validInput, confirmedDates, now);
  const series = await prisma.$transaction(async (tx) => {
    await validateSeriesReferences(tx, validInput);
    const created = await tx.sessionSeries.create({
      data: {
        title: validInput.title,
        tutor_id: validInput.tutorId,
        session_type: validInput.sessionType,
        weekday: validInput.weekday,
        start_minute: validInput.startMinute,
        duration_minutes: validInput.durationMinutes,
        starts_on: validInput.startsOn,
        ends_on: validInput.endsOn,
        pricing_profile_id: validInput.pricingProfileId,
        participants: { create: validInput.participantIds.map((student_id) => ({ student_id })) },
      },
      include: SERIES_INCLUDE,
    });
    if (historyDates.length > 0) {
      await materializeHistoricalOccurrences(tx, {
        ...created,
        starts_on: validInput.startsOn,
        weekday: validInput.weekday,
        start_minute: validInput.startMinute,
        duration_minutes: validInput.durationMinutes,
      }, historyDates, policy);
    }
    return created;
  });

  await materializeSessionSeries(series.id, policy);
  return getSessionSeries(series.id, policy);
}

export async function getSessionSeries(seriesId: string, policy: SeriesPricingPolicy) {
  const series = await prisma.sessionSeries.findUnique({
    where: { id: seriesId },
    include: {
      ...SERIES_INCLUDE,
      occurrences: {
        where: { historical_only: false, start_time: { gte: new Date() }, status: { in: ['SCHEDULED', 'ACTIVE'] } },
        orderBy: { start_time: 'asc' },
        take: 1,
        select: { id: true, start_time: true, end_time: true, status: true },
      },
    },
  });
  if (!series) throw new Error('Session series not found');
  return serializeSeries(series, policy);
}

export async function getAdminSeries(filter: SeriesScheduleFilter | undefined, policy: SeriesPricingPolicy) {
  if (filter?.tutorId) {
    await materializeActiveSeriesForTutor(filter.tutorId, policy);
  } else if (filter?.studentId) {
    await materializeActiveSeriesForStudent(filter.studentId, policy);
  } else {
    await materializeAllActiveSeries(policy);
  }
  const series = await prisma.sessionSeries.findMany({
    where: filter?.tutorId
      ? { tutor_id: filter.tutorId }
      : filter?.studentId
        ? { participants: { some: { student_id: filter.studentId } } }
        : undefined,
    include: {
      ...SERIES_INCLUDE,
      occurrences: {
        where: { historical_only: false, start_time: { gte: new Date() }, status: { in: ['SCHEDULED', 'ACTIVE'] } },
        orderBy: { start_time: 'asc' },
        take: 1,
        select: { id: true, start_time: true, end_time: true, status: true },
      },
    },
    orderBy: [{ weekday: 'asc' }, { start_minute: 'asc' }, { id: 'asc' }],
  });
  return series.map((item) => serializeSeries(item, policy));
}

export async function getAdminWeeklySchedule(tutorId: string | undefined, policy: SeriesPricingPolicy) {
  const [series, tutorFilter] = await Promise.all([
    getAdminSeries(tutorId ? { tutorId } : undefined, policy),
    tutorId ? prisma.user.findUnique({ where: { id: tutorId, role: 'TUTOR' }, select: { id: true, name: true } }) : Promise.resolve(null),
  ]);
  return { series, tutorFilter };
}

export async function updateSessionSeries(
  seriesId: string,
  input: SessionSeriesInput,
  scope: RecurrenceScope,
  policy: SeriesPricingPolicy,
  effectiveOccurrenceId?: string,
  confirmedDates?: string[],
) {
  const validScope = recurrenceScopeSchema.parse(scope);
  const validInput = parseSeriesInput(input);
  const now = new Date();
  if (validInput.historicalStartsOn && validScope !== 'ENTIRE_SERIES') {
    throw new Error('Historical backfill requires an entire-series edit');
  }
  if (validScope === 'THIS') {
    if (validInput.historicalStartsOn) throw new Error('Historical backfill requires a series-wide edit');
    if (!effectiveOccurrenceId) throw new Error('An occurrence is required for this-occurrence edits');
    const occurrence = await prisma.session.findFirst({
      where: { id: effectiveOccurrenceId, series_id: seriesId, historical_only: false },
      select: { occurrence_date: true },
    });
    if (!occurrence?.occurrence_date) throw new Error('The selected occurrence does not belong to this series');
    const start = academyDateTime(occurrence.occurrence_date, validInput.startMinute);
    const end = new Date(start.getTime() + validInput.durationMinutes * 60_000);
    return updateSession(effectiveOccurrenceId, {
      title: validInput.title,
      tutorId: validInput.tutorId,
      sessionType: validInput.sessionType,
      participantIds: validInput.participantIds,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }, policy, { markSeriesException: true });
  }

  const updatedId = await prisma.$transaction(async (tx) => {
    const series = await tx.sessionSeries.findUnique({
      where: { id: seriesId },
      include: { participants: { select: { student_id: true } } },
    });
    if (!series) throw new Error('Session series not found');
    await validateSeriesReferences(tx, validInput);

    const candidateHistoryDates = validInput.historicalStartsOn
      ? historicalOccurrenceDates({ weekday: validInput.weekday, starts_on: validInput.startsOn }, formatCalendarDate(validInput.historicalStartsOn), now)
      : [];
    const existingHistoryDates = candidateHistoryDates.length > 0
      ? await tx.session.findMany({
        where: { series_id: seriesId, occurrence_date: { in: candidateHistoryDates } },
        select: { occurrence_date: true },
      })
      : [];
    const existingHistoryKeys = new Set(existingHistoryDates.flatMap(({ occurrence_date }) => occurrence_date ? [formatCalendarDate(occurrence_date)] : []));
    const historyDates = confirmedHistoricalDates(validInput, confirmedDates, now, existingHistoryKeys);

    const effectiveDate = effectiveOccurrenceId
      ? (await tx.session.findFirst({ where: { id: effectiveOccurrenceId, series_id: seriesId, historical_only: false }, select: { occurrence_date: true } }))?.occurrence_date
      : academyCalendarDate();
    if (!effectiveDate) throw new Error('The selected occurrence does not belong to this series');

    const affected = await tx.session.findMany({
      where: { series_id: seriesId, occurrence_date: { gte: effectiveDate }, historical_only: false },
      select: {
        id: true,
        status: true,
        attendance_saved_at: true,
        attendance_finalized_at: true,
        _count: { select: { attendances: true, transactions: true } },
      },
    });
    const protectedOccurrences = affected.filter((item) =>
      item.status === 'COMPLETED' || item.attendance_saved_at || item.attendance_finalized_at || item._count.attendances > 0 || item._count.transactions > 0
    );
    if (validScope === 'THIS_AND_FUTURE' && protectedOccurrences.length > 0) {
      throw new Error('Future occurrences with attendance or financial history cannot be rewritten');
    }

    await tx.session.deleteMany({ where: { id: { in: affected.filter((item) => !protectedOccurrences.includes(item)).map((item) => item.id) } } });
    const updated = await tx.sessionSeries.update({
      where: { id: seriesId },
      data: {
        title: validInput.title,
        tutor_id: validInput.tutorId,
        session_type: validInput.sessionType,
        weekday: validInput.weekday,
        start_minute: validInput.startMinute,
        duration_minutes: validInput.durationMinutes,
        starts_on: validInput.startsOn,
        ends_on: validInput.endsOn,
        pricing_profile_id: validInput.pricingProfileId,
        status: 'ACTIVE',
        participants: {
          deleteMany: {},
          create: validInput.participantIds.map((student_id) => ({ student_id })),
        },
      },
      include: { participants: { select: { student_id: true } } },
    });
    if (historyDates.length > 0) {
      await materializeHistoricalOccurrences(tx, {
        ...updated,
        weekday: validInput.weekday,
        start_minute: validInput.startMinute,
        duration_minutes: validInput.durationMinutes,
      }, historyDates, policy);
    }
    return updated.id;
  });

  await materializeSessionSeries(updatedId, policy);
  return getSessionSeries(updatedId, policy);
}

export async function cancelSessionSeries(
  seriesId: string,
  scope: RecurrenceScope,
  policy: SeriesPricingPolicy,
  effectiveOccurrenceId?: string,
) {
  const validScope = recurrenceScopeSchema.parse(scope);
  if (validScope === 'THIS') {
    if (!effectiveOccurrenceId) throw new Error('An occurrence is required for this-occurrence cancellation');
    await cancelOccurrence(seriesId, effectiveOccurrenceId);
    return { success: true, scope: validScope } as const;
  }

  await prisma.$transaction(async (tx) => {
    const series = await tx.sessionSeries.findUnique({ where: { id: seriesId } });
    if (!series) throw new Error('Session series not found');
    const selected = effectiveOccurrenceId
      ? await tx.session.findFirst({ where: { id: effectiveOccurrenceId, series_id: seriesId, historical_only: false }, select: { occurrence_date: true } })
      : null;
    if (effectiveOccurrenceId && !selected?.occurrence_date) throw new Error('The selected occurrence does not belong to this series');
    const fromDate = selected?.occurrence_date || academyCalendarDate();
    const occurrences = await tx.session.findMany({
      where: { series_id: seriesId, occurrence_date: { gte: fromDate }, historical_only: false },
      select: { id: true, status: true, _count: { select: { attendances: true, transactions: true } } },
    });
    const protectedOccurrences = occurrences.filter((item) => item.status === 'COMPLETED' || item._count.attendances > 0 || item._count.transactions > 0);
    if (validScope === 'THIS_AND_FUTURE' && protectedOccurrences.length > 0) {
      throw new Error('Occurrences with attendance or financial history cannot be cancelled');
    }
    await tx.session.updateMany({ where: { id: { in: occurrences.filter((item) => !protectedOccurrences.includes(item)).map((item) => item.id) } }, data: { status: 'CANCELLED' } });
    await tx.sessionSeries.update({
      where: { id: seriesId },
      data: validScope === 'ENTIRE_SERIES'
        ? { status: 'CANCELLED' }
        : { status: 'ENDED', ends_on: new Date(fromDate.getTime() - 86_400_000) },
    });
  });

  return { success: true, scope: validScope } as const;
}

async function cancelOccurrence(seriesId: string, sessionId: string) {
  const occurrence = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, series_id: true, status: true, historical_only: true, _count: { select: { attendances: true, transactions: true } } },
  });
  if (!occurrence || occurrence.series_id !== seriesId) throw new Error('The selected occurrence does not belong to this series');
  if (occurrence.historical_only) throw new Error('Historical schedule records cannot be cancelled');
  if (occurrence.status === 'COMPLETED' || occurrence._count.attendances > 0 || occurrence._count.transactions > 0) {
    throw new Error('Occurrences with attendance or financial history cannot be cancelled');
  }
  await prisma.session.update({ where: { id: sessionId }, data: { status: 'CANCELLED', series_exception: true } });
}

export async function getTutorSeries(tutorId: string, policy: SeriesPricingPolicy) {
  return getAdminSeries({ tutorId }, policy);
}

export async function getStudentSeries(studentId: string, policy: SeriesPricingPolicy) {
  return getAdminSeries({ studentId }, policy);
}
