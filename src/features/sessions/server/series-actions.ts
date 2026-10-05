import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { parseCalendarDate, academyCalendarDate, academyDateTime, historicalOccurrenceDates, materializeActiveSeriesForStudent, materializeActiveSeriesForTutor, materializeAllActiveSeries, materializeSessionSeries } from './recurrence';
import { formatCalendarDate } from '@/shared/utils/calendar-date';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';
import { createSessionSchema, recurrenceScopeSchema, sessionSeriesSchema, type RecurrenceScope, type SessionSeriesInput } from '../schemas';
import { updateSession } from './session-actions';
import { expandLinkedGroupParticipantsTx } from './linked-group-pairing';
import { TABLE_PAGE_SIZE } from '@/shared/utils/pagination';
import { collectPrismaPages } from '@/shared/lib/prisma-pagination';

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
  slots: { where: { active: true }, orderBy: { weekday: 'asc' } },
} as const;

function requiredProfile(value: string | null, label: string) {
  if (!value) throw new Error(`${label} profile is incomplete`);
  return value;
}

function priceFor(type: 'PRIVATE' | 'GROUP', policy: SeriesPricingPolicy) {
  return type === 'PRIVATE' ? policy.privateSessionPrice : policy.groupSessionPrice;
}

function serialWeeklySlots(series: { weekday: number; start_minute: number; duration_minutes: number; slots: Array<{ id: string; weekday: number; start_minute: number; duration_minutes: number; timezone: string }> }) {
  return [...series.slots].sort((left, right) => {
    const primary = (slot: typeof left) => Number(slot.weekday === series.weekday && slot.start_minute === series.start_minute && slot.duration_minutes === series.duration_minutes);
    return primary(right) - primary(left) || left.weekday - right.weekday || left.start_minute - right.start_minute;
  }).map((slot) => ({ id: slot.id, weekday: slot.weekday, startMinute: slot.start_minute, durationMinutes: slot.duration_minutes, timezone: slot.timezone }));
}

function parseSeriesInput(input: SessionSeriesInput) {
  const parsed = sessionSeriesSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid recurring schedule');
  const weeklySlots = parsed.data.weeklySlots ?? [{ weekday: parsed.data.weekday, startMinute: parsed.data.startMinute, durationMinutes: parsed.data.durationMinutes }];
  if (weeklySlots.length > 1 && parsed.data.historicalStartsOn) throw new Error('Historical backfill is available only for single-slot series');
  return {
    ...parsed.data,
    weeklySlots,
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
  const existing = await collectPrismaPages((cursorId) => prisma.session.findMany({
    where: { series_id: seriesId, occurrence_date: { in: candidateDates } },
    select: { id: true, occurrence_date: true },
    orderBy: { id: 'asc' },
    take: 200,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
  }));
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
      where: { id: { in: input.participantIds }, role: 'STUDENT', account_status: { in: ['ACTIVE', 'PENDING_CREDENTIALS', 'PENDING_PROFILE'] } },
      select: { id: true, name: true },
      take: 4,
    }),
    input.pricingProfileId
      ? db.pricingProfile.findFirst({ where: { id: input.pricingProfileId, is_active: true }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (!tutor || tutor.role !== 'TUTOR' || tutor.account_status === 'DEACTIVATED' || !tutor.name) {
    throw new Error('A named current Tutor account is required');
  }
  if (students.length !== input.participantIds.length || students.some((student) => !student.name)) {
    throw new Error('Every assigned participant must be a named current Student');
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
  series_slot_id: string;
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
        series_slot_id: series.series_slot_id,
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

  const occurrences = await collectPrismaPages((cursorId) => tx.session.findMany({
    where: { series_slot_id: series.series_slot_id, occurrence_date: { in: dates }, historical_only: true },
    select: { id: true },
    orderBy: { id: 'asc' },
    take: 200,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
  }));
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
    slots: Array<{ id: string; weekday: number; start_minute: number; duration_minutes: number; timezone: string }>;
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
    programCode: series.program_code,
    courseName: series.course_name,
    level: series.level,
    weekday: series.weekday,
    startMinute: series.start_minute,
    durationMinutes: series.duration_minutes,
    weeklySlots: serialWeeklySlots(series),
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
    const participantIds = await expandLinkedGroupParticipantsTx(tx, validInput.participantIds, validInput.sessionType);
    await validateSeriesReferences(tx, { ...validInput, participantIds });
    const created = await tx.sessionSeries.create({
      data: {
        title: validInput.title,
        program_code: validInput.programCode ?? null,
        course_name: validInput.courseName ?? null,
        level: validInput.level ?? null,
        tutor_id: validInput.tutorId,
        session_type: validInput.sessionType,
        weekday: validInput.weekday,
        start_minute: validInput.startMinute,
        duration_minutes: validInput.durationMinutes,
        starts_on: validInput.startsOn,
        ends_on: validInput.endsOn,
        pricing_profile_id: validInput.pricingProfileId,
        slots: { create: validInput.weeklySlots.map((slot) => ({ weekday: slot.weekday, start_minute: slot.startMinute, duration_minutes: slot.durationMinutes })) },
        participants: { create: participantIds.map((student_id) => ({ student_id })) },
      },
      include: SERIES_INCLUDE,
    });
    if (historyDates.length > 0) {
      await materializeHistoricalOccurrences(tx, {
        ...created,
        series_slot_id: created.slots[0].id,
        starts_on: validInput.startsOn,
        weekday: validInput.weekday,
        start_minute: validInput.startMinute,
        duration_minutes: validInput.durationMinutes,
      }, historyDates, policy);
    }
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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

export async function getSessionSeriesHistory(seriesId: string) {
  const series = await prisma.sessionSeries.findUnique({
    where: { id: seriesId },
    include: {
      tutor: { select: { name: true } },
      slots: { where: { active: true }, orderBy: [{ weekday: 'asc' }, { start_minute: 'asc' }] },
      participants: { include: { student: { select: { name: true } } } },
      occurrences: {
        orderBy: [{ start_time: 'asc' }, { id: 'asc' }],
        include: {
          participants: { include: { student: { select: { name: true } } } },
          attendances: { include: { student: { select: { name: true } } }, orderBy: { attended_at: 'asc' } },
          tutor_compensation: { select: { id: true } },
          commission_entries: { select: { id: true } },
          transactions: { select: { id: true } },
        },
      },
    },
  });
  if (!series) throw new Error('Session series not found');
  return {
    id: series.id, title: series.title, status: series.status,
    tutorName: series.tutor.name || 'Tutor profile incomplete',
    students: series.participants.map(({ student }) => student.name || 'Student profile incomplete'),
    weekday: series.weekday, startMinute: series.start_minute, durationMinutes: series.duration_minutes,
    weeklySlots: serialWeeklySlots(series),
    programCode: series.program_code, courseName: series.course_name, level: series.level,
    startsOn: series.starts_on.toISOString(), endsOn: series.ends_on?.toISOString() ?? null,
    occurrences: series.occurrences.map((session) => ({
      id: session.id, title: session.title, status: session.status, startTime: session.start_time.toISOString(),
      historicalOnly: session.historical_only, exceptionReason: session.series_exception_reason,
      students: session.participants.map(({ student }) => student.name || 'Student profile incomplete'),
      attendances: session.attendances.map(({ student, attended_at }) => ({ studentName: student.name || 'Student profile incomplete', attendedAt: attended_at.toISOString() })),
      hasTutorCompensation: Boolean(session.tutor_compensation), commissionCount: session.commission_entries.length,
      transactionCount: session.transactions.length,
    })),
  };
}

export async function getAdminSeries(filter: SeriesScheduleFilter | undefined, policy: SeriesPricingPolicy) {
  if (filter?.tutorId) {
    await materializeActiveSeriesForTutor(filter.tutorId, policy);
  } else if (filter?.studentId) {
    await materializeActiveSeriesForStudent(filter.studentId, policy);
  } else {
    await materializeAllActiveSeries(policy);
  }
  const series = await collectPrismaPages((cursorId) => prisma.sessionSeries.findMany({
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
    take: 200,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
  }));
  return series.map((item) => serializeSeries(item, policy));
}

export async function getAdminWeeklySchedule(tutorId: string | undefined, policy: SeriesPricingPolicy) {
  const [series, tutorFilter] = await Promise.all([
    getAdminSeries(tutorId ? { tutorId } : undefined, policy),
    tutorId ? prisma.user.findUnique({ where: { id: tutorId, role: 'TUTOR' }, select: { id: true, name: true } }) : Promise.resolve(null),
  ]);
  return { series, tutorFilter };
}

export async function getAdminUpcomingSeriesPage(tutorId: string | undefined, page: number, policy: SeriesPricingPolicy, now = new Date()) {
  const where: Prisma.SessionSeriesWhereInput = {
    status: 'ACTIVE',
    ...(tutorId ? { tutor_id: tutorId } : {}),
    occurrences: {
      some: {
        historical_only: false,
        start_time: { gte: now },
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        series_slot: { is: { active: true } },
      },
    },
  };
  const groups = await collectPrismaPages((cursorId) => prisma.sessionSeries.findMany({
    where,
    include: {
      ...SERIES_INCLUDE,
      occurrences: {
        where: {
          historical_only: false,
          start_time: { gte: now },
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          series_slot: { is: { active: true } },
        },
        orderBy: { start_time: 'asc' },
        take: 1,
        select: { id: true, start_time: true, end_time: true, status: true },
      },
    },
    orderBy: { id: 'asc' },
    take: 200,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
  }));
  const sortedGroups = groups.map((item) => serializeSeries(item, policy)).sort((left, right) => {
    const timeOrder = Date.parse(left.nextOccurrence!.startTime) - Date.parse(right.nextOccurrence!.startTime);
    return timeOrder || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  });
  const totalCount = sortedGroups.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / TABLE_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Math.floor(page)), pageCount);
  return {
    items: sortedGroups.slice((currentPage - 1) * TABLE_PAGE_SIZE, currentPage * TABLE_PAGE_SIZE),
    totalCount,
    page: currentPage,
    pageCount,
    pageSize: TABLE_PAGE_SIZE,
  };
}

export async function updateSessionSeries(
  seriesId: string,
  input: SessionSeriesInput,
  scope: RecurrenceScope,
  policy: SeriesPricingPolicy,
  effectiveOccurrenceId?: string,
  confirmedDates?: string[],
) {
  const lifecycle = await prisma.sessionSeries.findUnique({ where: { id: seriesId }, select: { status: true } });
  if (!lifecycle) throw new Error('Session series not found');
  if (lifecycle.status !== 'ACTIVE') throw new Error('Ended or cancelled schedules cannot be edited or reactivated');
  const validScope = recurrenceScopeSchema.parse(scope);
  const validInput = parseSeriesInput(input);
  const now = new Date();
  if (validInput.historicalStartsOn && validScope !== 'ENTIRE_SERIES') {
    throw new Error('Historical backfill requires an entire-series edit');
  }
  if (validScope === 'THIS') {
    if (validInput.weeklySlots.length > 1) throw new Error('Edit the whole group to change multiple weekly times');
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
    }, policy, { markSeriesException: true, requireActiveSeriesId: seriesId });
  }

  const updatedId = await prisma.$transaction(async (tx) => {
    const series = await tx.sessionSeries.findUnique({
      where: { id: seriesId },
      include: { participants: { select: { student_id: true } }, slots: true },
    });
    if (!series) throw new Error('Session series not found');
    if (series.status !== 'ACTIVE') throw new Error('Ended or cancelled schedules cannot be edited or reactivated');
    const participantIds = await expandLinkedGroupParticipantsTx(tx, validInput.participantIds, validInput.sessionType, seriesId);
    await validateSeriesReferences(tx, { ...validInput, participantIds });

    const candidateHistoryDates = validInput.historicalStartsOn
      ? historicalOccurrenceDates({ weekday: validInput.weekday, starts_on: validInput.startsOn }, formatCalendarDate(validInput.historicalStartsOn), now)
      : [];
    const existingHistoryDates = candidateHistoryDates.length > 0
      ? await collectPrismaPages((cursorId) => tx.session.findMany({
        where: { series_id: seriesId, occurrence_date: { in: candidateHistoryDates } },
        select: { id: true, occurrence_date: true },
        orderBy: { id: 'asc' },
        take: 200,
        cursor: cursorId ? { id: cursorId } : undefined,
        skip: cursorId ? 1 : 0,
      }))
      : [];
    const existingHistoryKeys = new Set(existingHistoryDates.flatMap(({ occurrence_date }) => occurrence_date ? [formatCalendarDate(occurrence_date)] : []));
    const historyDates = confirmedHistoricalDates(validInput, confirmedDates, now, existingHistoryKeys);

    const effectiveDate = effectiveOccurrenceId
      ? (await tx.session.findFirst({ where: { id: effectiveOccurrenceId, series_id: seriesId, historical_only: false }, select: { occurrence_date: true } }))?.occurrence_date
      : academyCalendarDate();
    if (!effectiveDate) throw new Error('The selected occurrence does not belong to this series');

    const affected = await collectPrismaPages((cursorId) => tx.session.findMany({
      where: { series_id: seriesId, occurrence_date: { gte: effectiveDate }, historical_only: false },
      select: {
        id: true,
        status: true,
        attendance_saved_at: true,
        attendance_finalized_at: true,
        _count: { select: { attendances: true, transactions: true } },
      },
      orderBy: { id: 'asc' },
      take: 200,
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
    }));
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
        program_code: validInput.programCode ?? null,
        course_name: validInput.courseName ?? null,
        level: validInput.level ?? null,
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
          create: participantIds.map((student_id) => ({ student_id })),
        },
      },
      include: { participants: { select: { student_id: true } }, slots: true },
    });
    await tx.sessionSeriesSlot.updateMany({ where: { series_id: seriesId }, data: { active: false } });
    let primarySlotId = '';
    for (const [index, slot] of validInput.weeklySlots.entries()) {
      const stored = await tx.sessionSeriesSlot.upsert({
        where: { series_id_weekday_start_minute_duration_minutes: { series_id: seriesId, weekday: slot.weekday, start_minute: slot.startMinute, duration_minutes: slot.durationMinutes } },
        update: { active: true },
        create: { series_id: seriesId, weekday: slot.weekday, start_minute: slot.startMinute, duration_minutes: slot.durationMinutes },
      });
      if (index === 0) primarySlotId = stored.id;
    }
    if (historyDates.length > 0) {
      await materializeHistoricalOccurrences(tx, {
        ...updated,
        series_slot_id: primarySlotId,
        weekday: validInput.weekday,
        start_minute: validInput.startMinute,
        duration_minutes: validInput.durationMinutes,
      }, historyDates, policy);
    }
    return updated.id;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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
    if (series.status !== 'ACTIVE') throw new Error('Ended or cancelled schedules cannot be cancelled again');
    const selected = effectiveOccurrenceId
      ? await tx.session.findFirst({ where: { id: effectiveOccurrenceId, series_id: seriesId, historical_only: false }, select: { occurrence_date: true } })
      : null;
    if (effectiveOccurrenceId && !selected?.occurrence_date) throw new Error('The selected occurrence does not belong to this series');
    const fromDate = selected?.occurrence_date || academyCalendarDate();
    const occurrences = await collectPrismaPages((cursorId) => tx.session.findMany({
      where: { series_id: seriesId, occurrence_date: { gte: fromDate }, historical_only: false },
      select: { id: true, status: true, attendance_saved_at: true, attendance_finalized_at: true, _count: { select: { attendances: true, transactions: true } } },
      orderBy: { id: 'asc' },
      take: 200,
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
    }));
    const protectedOccurrences = occurrences.filter((item) => item.status === 'COMPLETED' || item.attendance_saved_at || item.attendance_finalized_at || item._count.attendances > 0 || item._count.transactions > 0);
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { success: true, scope: validScope } as const;
}

async function cancelOccurrence(seriesId: string, sessionId: string) {
  await prisma.$transaction(async (tx) => {
    const occurrence = await tx.session.findUnique({
      where: { id: sessionId },
      select: { id: true, series_id: true, status: true, historical_only: true, attendance_saved_at: true, attendance_finalized_at: true, series: { select: { status: true } }, _count: { select: { attendances: true, transactions: true } } },
    });
    if (!occurrence || occurrence.series_id !== seriesId) throw new Error('The selected occurrence does not belong to this series');
    if (occurrence.series?.status !== 'ACTIVE') throw new Error('Ended or cancelled schedules cannot be cancelled again');
    if (occurrence.historical_only) throw new Error('Historical schedule records cannot be cancelled');
    if (occurrence.status !== 'SCHEDULED' && occurrence.status !== 'ACTIVE') throw new Error('Only scheduled or active sessions can be cancelled');
    if (occurrence.attendance_saved_at || occurrence.attendance_finalized_at || occurrence._count.attendances > 0 || occurrence._count.transactions > 0) {
      throw new Error('Occurrences with attendance or financial history cannot be cancelled');
    }
    const result = await tx.session.updateMany({
      where: { id: sessionId, series_id: seriesId, historical_only: false, series: { is: { status: 'ACTIVE' } }, status: { in: ['SCHEDULED', 'ACTIVE'] }, attendance_saved_at: null, attendance_finalized_at: null, attendances: { none: {} }, transactions: { none: {} } },
      data: { status: 'CANCELLED', series_exception: true },
    });
    if (result.count !== 1) throw new Error('Session changed while cancellation was being processed. Review the schedule and try again.');
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getTutorSeries(tutorId: string, policy: SeriesPricingPolicy) {
  return getAdminSeries({ tutorId }, policy);
}

export async function getStudentSeries(studentId: string, policy: SeriesPricingPolicy) {
  return getAdminSeries({ studentId }, policy);
}
