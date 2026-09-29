import { afterAll, describe, expect, it } from 'vitest';
import { canonicalSeries, canonicalStudents, canonicalTutors } from '../../prisma/seed-data';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for canonical seed integration coverage');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;

const { prisma } = await import('@/shared/lib/prisma');
const { seedCanonicalDataset } = await import('../../prisma/seed');
const { materializeSessionSeries } = await import('@/features/sessions/server/recurrence');
const { default: bcrypt } = await import('bcryptjs');

type OptionalSeriesSlotUpdater = {
  sessionSeriesSlot?: {
    updateMany(args: { where: { series_id: string }; data: { weekday: number; start_minute: number } }): Promise<unknown>;
    create(args: { data: { series_id: string; weekday: number; start_minute: number; duration_minutes: number; timezone: string; active: boolean } }): Promise<unknown>;
  };
};

describe('canonical three-Tutor database seed', () => {
  afterAll(async () => {
    try {
      await seedCanonicalDataset(prisma);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('re-seeds without duplicates and persists the intended identities, rosters, schedules, and occurrences', async () => {
    const [database] = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
    expect(database.database).toBe('tutoring_platform_test');

    const first = await seedCanonicalDataset(prisma);
    const firstSeriesIds = Object.values(first.seriesIds);
    const firstSnapshot = {
      users: await prisma.user.count({ where: { id: { in: [...Object.values(first.tutorIds), ...Object.values(first.studentIds)] } } }),
      series: await prisma.sessionSeries.count({ where: { id: { in: firstSeriesIds } } }),
      seriesParticipants: await prisma.sessionSeriesParticipant.count({ where: { series_id: { in: firstSeriesIds } } }),
      sessions: await prisma.session.count({ where: { series_id: { in: firstSeriesIds } } }),
      sessionParticipants: await prisma.sessionParticipant.count({ where: { session: { series_id: { in: firstSeriesIds } } } }),
    };

    const oldMondaySeriesId = first.seriesIds['ahmed-mon1630'];
    await prisma.session.deleteMany({
      where: {
        series_id: oldMondaySeriesId,
        status: 'SCHEDULED',
        attendance_saved_at: null,
        attendance_submitted_at: null,
        attendance_finalized_at: null,
        attendances: { none: {} },
        transactions: { none: {} },
      },
    });
    await prisma.sessionSeries.update({ where: { id: oldMondaySeriesId }, data: { start_minute: 980 } });
    const slotUpdater = (prisma as unknown as OptionalSeriesSlotUpdater).sessionSeriesSlot;
    if (slotUpdater) await slotUpdater.updateMany({ where: { series_id: oldMondaySeriesId }, data: { weekday: 1, start_minute: 980 } });
    await materializeSessionSeries(oldMondaySeriesId, { checkInWindowHours: 4 });

    const oldFridaySeriesId = 'test-canonical-seed-obsolete-omar-friday';
    await prisma.sessionSeries.upsert({
      where: { id: oldFridaySeriesId },
      update: { tutor_id: first.tutorIds.omar, title: 'Old Omar Friday fixture', session_type: 'GROUP', weekday: 5, start_minute: 960, duration_minutes: 120, starts_on: new Date('2026-01-01T00:00:00.000Z'), status: 'ACTIVE' },
      create: { id: oldFridaySeriesId, tutor_id: first.tutorIds.omar, title: 'Old Omar Friday fixture', session_type: 'GROUP', weekday: 5, start_minute: 960, duration_minutes: 120, starts_on: new Date('2026-01-01T00:00:00.000Z'), status: 'ACTIVE' },
    });
    if (slotUpdater) {
      await slotUpdater.create({ data: { series_id: oldFridaySeriesId, weekday: 5, start_minute: 960, duration_minutes: 120, timezone: 'Africa/Cairo', active: true } });
    }
    await materializeSessionSeries(oldFridaySeriesId, { checkInWindowHours: 4 });
    expect(await prisma.session.count({ where: { series_id: oldMondaySeriesId, status: 'SCHEDULED' } })).toBeGreaterThan(0);
    expect(await prisma.sessionSeries.count({ where: { id: oldFridaySeriesId, status: 'ACTIVE' } })).toBe(1);

    const second = await seedCanonicalDataset(prisma);
    const seriesIds = Object.values(second.seriesIds);
    const secondSnapshot = {
      users: await prisma.user.count({ where: { id: { in: [...Object.values(second.tutorIds), ...Object.values(second.studentIds)] } } }),
      series: await prisma.sessionSeries.count({ where: { id: { in: seriesIds } } }),
      seriesParticipants: await prisma.sessionSeriesParticipant.count({ where: { series_id: { in: seriesIds } } }),
      sessions: await prisma.session.count({ where: { series_id: { in: seriesIds } } }),
      sessionParticipants: await prisma.sessionParticipant.count({ where: { session: { series_id: { in: seriesIds } } } }),
    };
    expect(secondSnapshot).toEqual(firstSnapshot);
    expect(second.tutorIds).toEqual(first.tutorIds);
    expect(second.studentIds).toEqual(first.studentIds);
    expect(second.seriesIds).toEqual(first.seriesIds);
    expect(secondSnapshot).toMatchObject({ users: 24, series: 15 });

    const admin = await prisma.user.findUniqueOrThrow({ where: { id: second.adminId } });
    expect(admin.role).toBe('ADMIN');
    expect(admin.account_status).toBe('ACTIVE');
    expect(admin.password_hash && await bcrypt.compare('password123', admin.password_hash)).toBe(true);

    const tutors = await prisma.user.findMany({ where: { id: { in: Object.values(second.tutorIds) } } });
    expect(tutors.map(({ name }) => name).sort()).toEqual(canonicalTutors.map(({ name }) => name).sort());
    for (const tutor of canonicalTutors) {
      const matches = await prisma.user.count({ where: { role: 'TUTOR', name: tutor.name } });
      expect(matches).toBe(1);
    }

    const series = await prisma.sessionSeries.findMany({
      where: { id: { in: seriesIds } },
      include: { tutor: true, participants: { include: { student: true } }, occurrences: { include: { participants: true } } },
    });
    expect(series).toHaveLength(canonicalSeries.length);
    const byKey = new Map(canonicalSeries.map((item) => [second.seriesIds[item.key], item]));
    let expectedSeriesParticipants = 0;
    for (const stored of series) {
      const assignment = byKey.get(stored.id)!;
      expect(stored).toMatchObject({
        title: assignment.title,
        tutor_id: second.tutorIds[assignment.tutor],
        session_type: 'GROUP',
        weekday: assignment.weekday,
        start_minute: assignment.startMinute,
        duration_minutes: assignment.durationMinutes,
        status: 'ACTIVE',
      });
      const roster = stored.participants.map(({ student }) => student.name).sort();
      const expectedRoster = assignment.studentKeys.map((key) => canonicalStudents.find((student) => student.key === key)!.name).sort();
      expect(roster).toEqual(expectedRoster);
      expectedSeriesParticipants += expectedRoster.length;

      const participantIds = stored.participants.map(({ student_id }) => student_id);
      for (const occurrence of stored.occurrences.filter((item) => item.status === 'SCHEDULED' && !item.series_exception && !item.historical_only)) {
        expect(occurrence.occurrence_date?.getUTCDay()).toBe(assignment.weekday);
        const localTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(occurrence.start_time);
        expect(localTime).toBe(`${String(Math.floor(assignment.startMinute / 60)).padStart(2, '0')}:${String(assignment.startMinute % 60).padStart(2, '0')}`);
        expect(occurrence.participants.map(({ student_id }) => student_id).sort()).toEqual([...participantIds].sort());
      }
    }
    expect(secondSnapshot.seriesParticipants).toBe(expectedSeriesParticipants);

    const ahmed = series.filter(({ tutor_id }) => tutor_id === second.tutorIds.ahmed);
    expect(ahmed.some(({ weekday, start_minute }) => weekday === 5 && start_minute === 960)).toBe(true);
    expect(ahmed.some(({ weekday, start_minute }) => weekday === 1 && start_minute === 990)).toBe(true);
    expect(ahmed.some(({ weekday, start_minute }) => weekday === 1 && start_minute === 980)).toBe(false);
    expect(ahmed.some(({ weekday, start_minute }) => weekday === 6 && start_minute === 1020)).toBe(true);
    expect(ahmed.some(({ weekday, start_minute }) => weekday === 6 && start_minute === 1080)).toBe(true);

    const omar = series.filter(({ tutor_id }) => tutor_id === second.tutorIds.omar);
    expect(omar.some(({ weekday, start_minute }) => weekday === 0 && start_minute === 1140)).toBe(true);
    expect(omar.some(({ weekday, start_minute }) => weekday === 3 && start_minute === 1080)).toBe(true);
    expect(await prisma.sessionSeries.count({ where: { tutor_id: second.tutorIds.omar, weekday: 5, status: 'ACTIVE' } })).toBe(0);
    const futureAhmed = await prisma.session.findMany({
      where: { tutor_id: second.tutorIds.ahmed, status: 'SCHEDULED', start_time: { gt: new Date() } },
      select: { start_time: true },
    });
    const futureFriday = await prisma.session.findMany({
      where: { tutor_id: second.tutorIds.omar, status: 'SCHEDULED', start_time: { gt: new Date() } },
      select: { start_time: true },
    });
    const cairoDateTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    expect(futureAhmed.map(({ start_time }) => cairoDateTime.format(start_time)).filter((value) => value.startsWith('Mon 16:20'))).toEqual([]);
    expect(futureFriday.map(({ start_time }) => cairoDateTime.format(start_time)).filter((value) => value.startsWith('Fri 16:00') || value.startsWith('Fri 20:00'))).toEqual([]);

    const occurrenceIds = series.flatMap(({ occurrences }) => occurrences.map(({ id }) => id));
    expect(await prisma.attendanceRecord.count({ where: { session_id: { in: occurrenceIds } } })).toBe(0);
    expect(await prisma.walletTransaction.count({ where: { session_id: { in: occurrenceIds } } })).toBe(0);
    expect(await prisma.tutorCompensationLedgerEntry.count({ where: { session_id: { in: occurrenceIds } } })).toBe(0);
    expect(await prisma.commissionLedgerEntry.count({ where: { session_id: { in: occurrenceIds } } })).toBe(0);
  });
});
