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
  getSessionSeriesHistory,
  getStudentSeries,
  getTutorSeries,
  previewHistoricalSeries,
  updateSessionSeries,
} = await import('@/features/sessions/server/series-actions');
const { rescheduleSessionOccurrence } = await import('@/features/sessions/server/session-actions');
const { getAdminAttendanceAttention } = await import('@/features/attendance/server/admin-attendance');

const prefix = `test-002-series-${process.pid}-${Date.now()}-`;
let counter = 0;
const policy = { checkInWindowHours: 4, groupSessionPrice: 375, privateSessionPrice: 500 };

async function createUser(role: 'ADMIN' | 'TUTOR' | 'STUDENT') {
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
  await prisma.linkedStudentRelationship.deleteMany({ where: { created_by_admin: { email: { startsWith: prefix } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
}

async function createLinkedPair(adminId: string, firstId: string, secondId: string) {
  const [student_a_id, student_b_id] = [firstId, secondId].sort();
  return prisma.linkedStudentRelationship.create({ data: { student_a_id, student_b_id, created_by_admin_id: adminId } });
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

  it('keeps one multi-day cohort, idempotent slot occurrences, concrete attendance, and completed history', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const input = {
      ...baseInput(tutor.id, student.id, `${prefix}intensive`),
      programCode: 'P5' as const, courseName: 'Python', level: null,
      weekday: 6, startMinute: 1140, durationMinutes: 120,
      weeklySlots: [
        { weekday: 6, startMinute: 1140, durationMinutes: 120 },
        { weekday: 0, startMinute: 1140, durationMinutes: 120 },
        { weekday: 1, startMinute: 1140, durationMinutes: 120 },
      ],
    };
    const created = await createSessionSeries(input, policy);
    const stored = await prisma.sessionSeries.findUniqueOrThrow({ where: { id: created.id }, include: { slots: true, participants: true } });
    expect(stored.slots).toHaveLength(3);
    expect(stored.participants.map((participant) => participant.student_id)).toEqual([student.id]);
    expect(await getTutorSeries(tutor.id, policy)).toHaveLength(1);

    const first = await occurrences(created.id);
    expect(new Set(first.map((item) => item.series_slot_id)).size).toBe(3);
    expect(first.every((item) => item.tutor_id === tutor.id && item.participants.length === 1 && item.participants[0].student_id === student.id)).toBe(true);
    await Promise.all([materializeSessionSeries(created.id, policy), materializeSessionSeries(created.id, policy)]);
    const repeated = await occurrences(created.id);
    expect(repeated).toHaveLength(first.length);
    expect(new Set(repeated.map((item) => `${item.series_slot_id}:${item.occurrence_date?.toISOString()}`)).size).toBe(repeated.length);

    const protectedOccurrence = repeated[0];
    const anotherOccurrence = repeated[1];
    await prisma.sessionParticipant.update({ where: { session_id_student_id: { session_id: protectedOccurrence.id, student_id: student.id } }, data: { attendance_outcome: 'PRESENT' } });
    expect((await prisma.sessionParticipant.findUniqueOrThrow({ where: { session_id_student_id: { session_id: anotherOccurrence.id, student_id: student.id } } })).attendance_outcome).toBeNull();
    await prisma.session.update({ where: { id: protectedOccurrence.id }, data: { status: 'COMPLETED' } });
    const originalStart = protectedOccurrence.start_time.getTime();
    await updateSessionSeries(created.id, {
      ...input,
      weekday: 5,
      weeklySlots: [
        { weekday: 5, startMinute: 1140, durationMinutes: 120 },
        { weekday: 0, startMinute: 1140, durationMinutes: 120 },
        { weekday: 1, startMinute: 1140, durationMinutes: 120 },
      ],
    }, 'ENTIRE_SERIES', policy);
    const retained = await prisma.session.findUniqueOrThrow({ where: { id: protectedOccurrence.id }, include: { participants: true } });
    expect(retained.status).toBe('COMPLETED');
    expect(retained.start_time.getTime()).toBe(originalStart);
    expect(retained.participants[0].attendance_outcome).toBe('PRESENT');
    expect((await prisma.sessionSeries.findUniqueOrThrow({ where: { id: created.id }, include: { slots: { where: { active: true } } } })).slots).toHaveLength(3);
  });

  it('auto-assigns linked Students together for Groups, preserves PRIVATE rosters, and rejects capacity atomically', async () => {
    const admin = await createUser('ADMIN');
    const tutor = await createUser('TUTOR');
    const [ahmed, mohamed] = await Promise.all([createUser('STUDENT'), createUser('STUDENT')]);
    await createLinkedPair(admin.id, ahmed.id, mohamed.id);
    const paired = await createSeries(tutor.id, ahmed.id, `${prefix}linked-group`);
    expect([...paired.participantIds].sort()).toEqual([ahmed.id, mohamed.id].sort());
    const repeatedAssignment = await updateSessionSeries(paired.id, {
      ...baseInput(tutor.id, ahmed.id, `${prefix}linked-group`),
      participantIds: [ahmed.id, mohamed.id],
    }, 'ENTIRE_SERIES', policy);
    expect(repeatedAssignment.id).toBe(paired.id);
    const repeatedRoster = await prisma.sessionSeriesParticipant.findMany({ where: { series_id: paired.id }, select: { student_id: true } });
    expect(repeatedRoster.map(({ student_id }) => student_id).sort()).toEqual([ahmed.id, mohamed.id].sort());

    const privateInput = { ...baseInput(tutor.id, mohamed.id, `${prefix}linked-private`), sessionType: 'PRIVATE' as const };
    const privateSeries = await createSessionSeries(privateInput, policy);
    expect(privateSeries.participantIds).toEqual([mohamed.id]);
    const splitEnrollment = (await getAdminAttendanceAttention()).find((item) => item.warnings.includes('LINKED_STUDENTS_DIFFERENT_ENROLLMENT'));
    expect(splitEnrollment?.linkedStudents?.map((student) => student.id).sort()).toEqual([ahmed.id, mohamed.id].sort());

    const [one, two, three, capacityA, capacityB] = await Promise.all([createUser('STUDENT'), createUser('STUDENT'), createUser('STUDENT'), createUser('STUDENT'), createUser('STUDENT')]);
    await createLinkedPair(admin.id, capacityA.id, capacityB.id);
    const fullInput = { ...baseInput(tutor.id, one.id, `${prefix}capacity`), participantIds: [one.id, two.id, three.id] };
    const fullGroup = await createSessionSeries(fullInput, policy);
    const attempted = { ...fullInput, participantIds: [one.id, two.id, three.id, capacityA.id] };
    await expect(updateSessionSeries(fullGroup.id, attempted, 'ENTIRE_SERIES', policy))
      .rejects.toThrow('2 linked seats required; 1 seat available');
    const stored = await prisma.sessionSeriesParticipant.findMany({ where: { series_id: fullGroup.id }, select: { student_id: true } });
    expect(stored.map(({ student_id }) => student_id).sort()).toEqual([one.id, two.id, three.id].sort());
  });

  it('surfaces linked Students that were already assigned to different Groups', async () => {
    const admin = await createUser('ADMIN');
    const tutor = await createUser('TUTOR');
    const [ahmed, mohamed] = await Promise.all([createUser('STUDENT'), createUser('STUDENT')]);
    await createSeries(tutor.id, ahmed.id, `${prefix}different-group-a`);
    await createSeries(tutor.id, mohamed.id, `${prefix}different-group-b`);
    await createLinkedPair(admin.id, ahmed.id, mohamed.id);

    const concern = (await getAdminAttendanceAttention()).find((item) => item.warnings.includes('LINKED_STUDENTS_DIFFERENT_GROUPS'));
    expect(concern?.linkedStudents?.map((student) => student.id).sort()).toEqual([ahmed.id, mohamed.id].sort());
    expect(concern?.reviewHref).toBe(`/admin/accounts/${[ahmed.id, mohamed.id].sort()[0]}`);
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
      new Date(first.start_time.getTime() - 1),
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

  it('rejects Tutor postponement at or after the concrete occurrence start', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const created = await createSeries(tutor.id, student.id, `${prefix}started-postpone`);
    const [first] = await occurrences(created.id);
    const start = first.start_time;
    await expect(rescheduleSessionOccurrence(
      first.id,
      { startTime: new Date(start.getTime() + 60_000).toISOString(), endTime: new Date(first.end_time.getTime() + 60_000).toISOString(), reason: 'Session already started' },
      policy,
      { id: tutor.id, role: 'TUTOR' },
      start,
    )).rejects.toThrow('A Session can only be postponed before it starts.');
    const unchanged = await prisma.session.findUniqueOrThrow({ where: { id: first.id } });
    expect(unchanged.start_time).toEqual(start);
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

  it('rejects edits and cancellations after a series has ended', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const series = await createSeries(tutor.id, student.id, `${prefix}archived-guard`);
    const rows = await occurrences(series.id);
    await prisma.sessionSeries.update({ where: { id: series.id }, data: { status: 'ENDED' } });

    await expect(updateSessionSeries(series.id, { ...baseInput(tutor.id, student.id, `${prefix}should-not-edit`), startMinute: 16 * 60 }, 'ENTIRE_SERIES', policy)).rejects.toThrow('Ended or cancelled schedules cannot be edited or reactivated');
    await expect(updateSessionSeries(series.id, { ...baseInput(tutor.id, student.id, `${prefix}should-not-edit-this`), startMinute: 16 * 60 }, 'THIS', policy, rows[0].id)).rejects.toThrow('Ended or cancelled schedules cannot be edited or reactivated');
    await expect(cancelSessionSeries(series.id, 'THIS', policy, rows[0].id)).rejects.toThrow('Ended or cancelled schedules cannot be cancelled again');
    expect((await prisma.sessionSeries.findUniqueOrThrow({ where: { id: series.id } })).status).toBe('ENDED');
    expect((await prisma.session.findUniqueOrThrow({ where: { id: rows[0].id } })).status).toBe('SCHEDULED');
  });

  it('preserves sessions with saved all-absent attendance in single and multi-scope cancellation', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const series = await createSeries(tutor.id, student.id, `${prefix}absent-history`);
    const rows = await occurrences(series.id);
    const savedAt = new Date();
    await prisma.session.update({ where: { id: rows[0].id }, data: { attendance_saved_at: savedAt } });

    expect(await prisma.attendanceRecord.count({ where: { session_id: rows[0].id } })).toBe(0);
    await expect(cancelSessionSeries(series.id, 'THIS', policy, rows[0].id)).rejects.toThrow('Occurrences with attendance or financial history cannot be cancelled');
    await expect(cancelSessionSeries(series.id, 'THIS_AND_FUTURE', policy, rows[0].id)).rejects.toThrow('Occurrences with attendance or financial history cannot be cancelled');
    const unchanged = await prisma.session.findUniqueOrThrow({ where: { id: rows[0].id } });
    expect(unchanged.status).toBe('SCHEDULED');
    expect(unchanged.attendance_saved_at).toEqual(savedAt);
    expect((await prisma.sessionSeries.findUniqueOrThrow({ where: { id: series.id } })).status).toBe('ACTIVE');
  });

  it('returns read-only series history with cancelled occurrences and attendance provenance', async () => {
    const tutor = await createUser('TUTOR');
    const student = await createUser('STUDENT');
    const series = await createSeries(tutor.id, student.id, `${prefix}history`);
    const rows = await occurrences(series.id);
    await prisma.attendanceRecord.create({ data: { session_id: rows[0].id, student_id: student.id } });
    await prisma.session.updateMany({ where: { series_id: series.id }, data: { status: 'CANCELLED' } });
    await prisma.sessionSeries.update({ where: { id: series.id }, data: { status: 'CANCELLED' } });

    const history = await getSessionSeriesHistory(series.id);
    expect(history.status).toBe('CANCELLED');
    expect(history.tutorName).toContain('TUTOR');
    expect(history.occurrences).toHaveLength(rows.length);
    expect(history.occurrences[0]).toMatchObject({ status: 'CANCELLED', students: [expect.any(String)] });
    expect(history.occurrences[0].attendances.map(({ studentName }) => studentName)).toEqual([expect.stringContaining('STUDENT')]);
    expect(history.occurrences.every((occurrence) => occurrence.status === 'CANCELLED')).toBe(true);
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
