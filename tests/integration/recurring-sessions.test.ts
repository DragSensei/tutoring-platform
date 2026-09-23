import { afterAll, describe, expect, it } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for database-backed integration tests');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;

const { prisma } = await import('@/shared/lib/prisma');
const {
  academyCalendarDate,
  academyDateTime,
  materializeSessionSeries,
} = await import('@/features/sessions/server/recurrence');
const { addCalendarDays, formatCalendarDate } = await import('@/shared/utils/calendar-date');
const {
  cancelSessionSeries,
  createSessionSeries,
  getAdminSeries,
  getStudentSeries,
  getTutorSeries,
  previewHistoricalSeries,
  updateSessionSeries,
} = await import('@/features/sessions/server/series-actions');
const { rescheduleSessionOccurrence } = await import('@/features/sessions/server/session-actions');

const prefix = `test-002-series-${process.pid}-${Date.now()}-`;
let counter = 0;
const policy = { checkInWindowHours: 4, groupSessionPrice: 375, privateSessionPrice: 500 };

async function createUser(role: 'TUTOR' | 'STUDENT') {
  const id = `${prefix}${counter++}`;
  return prisma.user.create({
    data: {
      name: `${role} ${id}`,
      email: `${id}@example.com`,
      phone: `+2020${String(counter).padStart(8, '0')}`,
      password_hash: 'fixture-password-hash',
      role,
      account_status: 'ACTIVE',
    },
  });
}

function currentCalendarDate() {
  return academyCalendarDate(new Date());
}

function baseInput(tutorId: string, studentId: string, title = `${prefix}weekly`) {
  const startsOn = currentCalendarDate();
  return {
    title,
    tutorId,
    sessionType: 'GROUP' as const,
    participantIds: [studentId],
    weekday: startsOn.getUTCDay(),
    startMinute: 17 * 60,
    durationMinutes: 90,
    startsOn: startsOn.toISOString().slice(0, 10),
    endsOn: undefined,
    pricingProfileId: null,
    historicalStartsOn: null,
  };
}

async function createSeries(tutorId: string, studentId: string, title = `${prefix}weekly`) {
  return createSessionSeries(baseInput(tutorId, studentId, title), policy);
}

async function occurrences(seriesId: string) {
  return prisma.session.findMany({ where: { series_id: seriesId }, orderBy: { occurrence_date: 'asc' }, include: { participants: true } });
}

async function cleanup() {
  await prisma.session.deleteMany({ where: { title: { startsWith: prefix } } });
  await prisma.sessionSeries.deleteMany({ where: { title: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
}

describe('recurring weekly sessions', () => {
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('materializes a bounded Cairo schedule with duration, roster snapshots, and idempotency', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const created = await createSeries(tutor.id, student.id);
    const first = await occurrences(created.id);

    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThanOrEqual(13);
    expect(first.every((item) => item.occurrence_date?.getUTCDay() === currentCalendarDate().getUTCDay())).toBe(true);
    expect(first.every((item) => item.end_time.getTime() - item.start_time.getTime() === 90 * 60_000)).toBe(true);
    expect(first[0].participants.map((participant) => participant.student_id)).toEqual([student.id]);

    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(first[0].start_time);
    expect(Object.fromEntries(parts.map(({ type, value }) => [type, value]))).toMatchObject({ hour: '17', minute: '00' });

    await materializeSessionSeries(created.id, policy);
    await materializeSessionSeries(created.id, policy);
    const repeated = await occurrences(created.id);
    expect(repeated).toHaveLength(first.length);
    expect(repeated.reduce((sum, item) => sum + item.participants.length, 0)).toBe(first.length);
  });

  it('previews, confirms, and idempotently backfills only marked pre-system occurrences', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const today = currentCalendarDate();
    const historicalStartsOn = addCalendarDays(today, -28);
    const startsOn = addCalendarDays(today, 21);
    const input = {
      ...baseInput(tutor.id, student.id, `${prefix}historical`),
      startsOn: formatCalendarDate(startsOn),
      weekday: today.getUTCDay(),
      historicalStartsOn: formatCalendarDate(historicalStartsOn),
    };
    const preview = await previewHistoricalSeries(input);
    expect(preview).toHaveLength(4);
    expect(preview.every((date) => date < formatCalendarDate(today))).toBe(true);

    const staleInput = { ...input, weekday: (input.weekday + 1) % 7 };
    await expect(createSessionSeries(staleInput, policy, preview)).rejects.toThrow('preview has expired');

    const created = await createSessionSeries(input, policy, preview);
    const history = await prisma.session.findMany({
      where: { series_id: created.id, historical_only: true },
      orderBy: { occurrence_date: 'asc' },
      select: { occurrence_date: true, status: true, historical_only: true, attendance_finalized_at: true },
    });
    expect(history.map((session) => session.occurrence_date && formatCalendarDate(session.occurrence_date))).toEqual(preview);
    expect(history.every((session) => session.historical_only && session.status === 'SCHEDULED' && !session.attendance_finalized_at)).toBe(true);

    const repeatedPreview = await previewHistoricalSeries(input, created.id);
    expect(repeatedPreview).toEqual([]);
    await updateSessionSeries(created.id, input, 'ENTIRE_SERIES', policy, undefined, repeatedPreview);
    const afterRepeat = await prisma.session.findMany({ where: { series_id: created.id, historical_only: true } });
    expect(afterRepeat).toHaveLength(preview.length);
  });

  it('survives concurrent materialization without duplicate sessions or participants', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const created = await createSeries(tutor.id, student.id, `${prefix}concurrent`);
    await Promise.all([
      materializeSessionSeries(created.id, policy),
      materializeSessionSeries(created.id, policy),
      materializeSessionSeries(created.id, policy),
    ]);
    const result = await occurrences(created.id);
    expect(new Set(result.map((item) => item.occurrence_date?.toISOString())).size).toBe(result.length);
    expect(result.every((item) => item.participants.length === 1)).toBe(true);
  });

  it('restricts Tutor, Student, and Admin-filtered reads to the selected owner', async () => {
    const tutorA = await createUser('TUTOR');
    const tutorB = await createUser('TUTOR');
    const studentA = await createUser('STUDENT');
    const studentB = await createUser('STUDENT');
    const seriesA = await createSeries(tutorA.id, studentA.id, `${prefix}owner-a`);
    await createSeries(tutorB.id, studentB.id, `${prefix}owner-b`);

    expect((await getTutorSeries(tutorA.id, policy)).map((item) => item.id)).toEqual([seriesA.id]);
    expect((await getStudentSeries(studentA.id, policy)).map((item) => item.id)).toEqual([seriesA.id]);
    expect((await getAdminSeries({ tutorId: tutorA.id }, policy)).map((item) => item.id)).toEqual([seriesA.id]);
  });

  it('uses the selected occurrence date for THIS edits and preserves the recurring wall-clock request', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const created = await createSeries(tutor.id, student.id, `${prefix}this-edit`);
    const before = (await occurrences(created.id))[0];
    const input = { ...baseInput(tutor.id, student.id, `${prefix}this-edited`), startMinute: 19 * 60 + 30, durationMinutes: 75 };

    const updated = await updateSessionSeries(created.id, input, 'THIS', policy, before.id);
    const after = await prisma.session.findUniqueOrThrow({ where: { id: before.id } });
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(after.start_time);
    expect(Object.fromEntries(local.map(({ type, value }) => [type, value]))).toMatchObject({ hour: '19', minute: '30' });
    expect(after.occurrence_date?.toISOString()).toBe(before.occurrence_date?.toISOString());
    expect(after.end_time.getTime() - after.start_time.getTime()).toBe(75 * 60_000);
    expect(after.series_exception).toBe(true);
    expect((updated as { startTime: string }).startTime).toBe(after.start_time.toISOString());
  });

  it('postpones only the concrete occurrence and leaves the weekly series and next recurrence intact', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const created = await createSeries(tutor.id, student.id, `${prefix}postpone`);
    const before = await occurrences(created.id);
    const first = before[0];
    const next = before[1];
    const postponedStart = new Date(first.start_time.getTime() + 2 * 60 * 60 * 1000);
    const postponedEnd = new Date(first.end_time.getTime() + 2 * 60 * 60 * 1000);

    const result = await rescheduleSessionOccurrence(
      first.id,
      { startTime: postponedStart.toISOString(), endTime: postponedEnd.toISOString(), reason: 'Tutor availability change' },
      policy,
      { id: tutor.id, role: 'TUTOR' },
    );
    const after = await prisma.session.findUniqueOrThrow({ where: { id: first.id } });
    const seriesAfter = await prisma.sessionSeries.findUniqueOrThrow({ where: { id: created.id } });
    const nextAfter = await prisma.session.findUniqueOrThrow({ where: { id: next.id } });

    expect(result.startTime).toBe(postponedStart.toISOString());
    expect(after.start_time.toISOString()).toBe(postponedStart.toISOString());
    expect(after.end_time.toISOString()).toBe(postponedEnd.toISOString());
    expect(after.series_exception).toBe(true);
    expect(after.series_exception_reason).toBe('Tutor availability change');
    expect(seriesAfter.start_minute).toBe(17 * 60);
    expect(nextAfter.start_time).toEqual(next.start_time);
  });

  it('supports THIS_AND_FUTURE and ENTIRE_SERIES edits without changing history rows', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const split = await createSeries(tutor.id, student.id, `${prefix}future-edit`);
    const splitBefore = await occurrences(split.id);
    expect(splitBefore.length).toBeGreaterThan(2);
    await prisma.session.update({ where: { id: splitBefore[0].id }, data: { status: 'COMPLETED' } });
    const historySnapshot = await prisma.session.findUniqueOrThrow({ where: { id: splitBefore[0].id } });
    await updateSessionSeries(split.id, { ...baseInput(tutor.id, student.id, `${prefix}future-edited`), startMinute: 18 * 60 }, 'THIS_AND_FUTURE', policy, splitBefore[1].id);
    const splitAfterHistory = await prisma.session.findUniqueOrThrow({ where: { id: splitBefore[0].id } });
    expect(splitAfterHistory.title).toBe(historySnapshot.title);
    expect(splitAfterHistory.start_time).toEqual(historySnapshot.start_time);
    expect(splitAfterHistory.status).toBe('COMPLETED');
    expect((await occurrences(split.id)).some((item) => item.start_time.getTime() !== historySnapshot.start_time.getTime() && item.title === `${prefix}future-edited`)).toBe(true);

    const entire = await createSeries(tutor.id, student.id, `${prefix}entire-edit`);
    const entireBefore = await occurrences(entire.id);
    await prisma.session.update({ where: { id: entireBefore[0].id }, data: { status: 'COMPLETED' } });
    const entireHistory = await prisma.session.findUniqueOrThrow({ where: { id: entireBefore[0].id } });
    await updateSessionSeries(entire.id, { ...baseInput(tutor.id, student.id, `${prefix}entire-edited`), startMinute: 16 * 60 }, 'ENTIRE_SERIES', policy);
    const entireAfterHistory = await prisma.session.findUniqueOrThrow({ where: { id: entireBefore[0].id } });
    expect(entireAfterHistory.title).toBe(entireHistory.title);
    expect(entireAfterHistory.start_time).toEqual(entireHistory.start_time);
    expect(entireAfterHistory.status).toBe('COMPLETED');
  });

  it('supports THIS, THIS_AND_FUTURE, and ENTIRE_SERIES cancellation scopes', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');

    const one = await createSeries(tutor.id, student.id, `${prefix}cancel-this`);
    const oneRows = await occurrences(one.id);
    await cancelSessionSeries(one.id, 'THIS', policy, oneRows[0].id);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: oneRows[0].id } })).status).toBe('CANCELLED');
    expect((await prisma.sessionSeries.findUniqueOrThrow({ where: { id: one.id } })).status).toBe('ACTIVE');

    const future = await createSeries(tutor.id, student.id, `${prefix}cancel-future`);
    const futureRows = await occurrences(future.id);
    await cancelSessionSeries(future.id, 'THIS_AND_FUTURE', policy, futureRows[1].id);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: futureRows[0].id } })).status).toBe('SCHEDULED');
    expect((await occurrences(future.id)).slice(1).every((item) => item.status === 'CANCELLED')).toBe(true);
    expect((await prisma.sessionSeries.findUniqueOrThrow({ where: { id: future.id } })).status).toBe('ENDED');

    const entire = await createSeries(tutor.id, student.id, `${prefix}cancel-entire`);
    await cancelSessionSeries(entire.id, 'ENTIRE_SERIES', policy);
    expect((await occurrences(entire.id)).every((item) => item.status === 'CANCELLED')).toBe(true);
    expect((await prisma.sessionSeries.findUniqueOrThrow({ where: { id: entire.id } })).status).toBe('CANCELLED');
  });

  it('marks an active series ended after its end date and materializes no more occurrences', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const yesterday = new Date(currentCalendarDate().getTime() - 86_400_000);
    const input = baseInput(tutor.id, student.id, `${prefix}ended`);
    const series = await prisma.sessionSeries.create({
      data: {
        title: input.title,
        tutor_id: input.tutorId,
        session_type: input.sessionType,
        weekday: input.weekday,
        start_minute: input.startMinute,
        duration_minutes: input.durationMinutes,
        starts_on: currentCalendarDate(),
        ends_on: yesterday,
        participants: { create: [{ student_id: student.id }] },
      },
    });
    await materializeSessionSeries(series.id, policy);
    const stored = await prisma.sessionSeries.findUniqueOrThrow({ where: { id: series.id } });
    expect(stored.status).toBe('ENDED');
    expect(await prisma.session.count({ where: { series_id: series.id } })).toBe(0);
  });

  it('pins academy calendar dates across a Cairo midnight boundary', () => {
    const cairoAfterMidnight = new Date('2026-01-01T22:30:00.000Z');
    expect(academyCalendarDate(cairoAfterMidnight).toISOString().slice(0, 10)).toBe('2026-01-02');
    const scheduled = academyDateTime(academyCalendarDate(cairoAfterMidnight), 30);
    expect(scheduled.toISOString()).toBe('2026-01-01T22:30:00.000Z');
  });
});
