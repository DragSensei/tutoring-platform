import { Prisma, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { materializeSessionSeries } from '../src/features/sessions/server/recurrence';
import { prisma } from '../src/shared/lib/prisma';
import {
  canonicalSeries,
  canonicalStudents,
  canonicalTutors,
  legacyDemoSessionTitles,
  legacyDemoStudentEmails,
  legacyDemoPhoneNumbers,
  type SeedTutorKey,
} from './seed-data';

const localPassword = 'password123';
const startsOn = new Date('2026-01-01T00:00:00.000Z');

type Transaction = Prisma.TransactionClient;
type OptionalSeriesSlotWriter = {
  sessionSeriesSlot?: {
    findMany(args: { where: { series_id: string }; select: { id: true; weekday: true; start_minute: true; duration_minutes: true; active: true } }): Promise<Array<{ id: string; weekday: number; start_minute: number; duration_minutes: number; active: boolean }>>;
    deleteMany(args: { where: { id: { in: string[] } } }): Promise<unknown>;
    update(args: { where: { id: string }; data: { active: boolean } }): Promise<unknown>;
    create(args: { data: { series_id: string; weekday: number; start_minute: number; duration_minutes: number; timezone: string; active: boolean } }): Promise<unknown>;
  };
};

async function removePrototypeData(tx: Transaction) {
  const legacyStudents = await tx.user.findMany({
    where: { role: 'STUDENT', email: { in: [...legacyDemoStudentEmails] } },
    select: { id: true, wallet: { select: { id: true } } },
  });
  const studentIds = legacyStudents.map(({ id }) => id);
  const walletIds = legacyStudents.flatMap(({ wallet }) => wallet ? [wallet.id] : []);
  const demoSessions = await tx.session.findMany({
    where: { title: { in: [...legacyDemoSessionTitles] } },
    select: { id: true },
  });
  const sessionIds = demoSessions.map(({ id }) => id);

  if (sessionIds.length) {
    await tx.commissionLedgerEntry.deleteMany({ where: { session_id: { in: sessionIds } } });
    await tx.tutorCompensationLedgerEntry.deleteMany({ where: { session_id: { in: sessionIds } } });
  }
  const transactionScope = [
    ...(walletIds.length ? [{ wallet_id: { in: walletIds } }] : []),
    ...(sessionIds.length ? [{ session_id: { in: sessionIds } }] : []),
  ];
  if (transactionScope.length) await tx.walletTransaction.deleteMany({ where: { OR: transactionScope } });
  if (sessionIds.length) {
    await tx.attendanceRecoveryGrant.deleteMany({ where: { session_id: { in: sessionIds } } });
    await tx.attendanceRecord.deleteMany({ where: { session_id: { in: sessionIds } } });
    await tx.sessionParticipant.deleteMany({ where: { session_id: { in: sessionIds } } });
    await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
  }
  if (studentIds.length) {
    await tx.linkedStudentRelationship.deleteMany({
      where: { OR: [{ student_a_id: { in: studentIds } }, { student_b_id: { in: studentIds } }] },
    });
    await tx.sessionSeriesParticipant.deleteMany({ where: { student_id: { in: studentIds } } });
    await tx.sessionParticipant.deleteMany({ where: { student_id: { in: studentIds } } });
    await tx.attendanceRecord.deleteMany({ where: { student_id: { in: studentIds } } });
    await tx.accountSetupToken.deleteMany({ where: { user_id: { in: studentIds } } });
    await tx.wallet.deleteMany({ where: { user_id: { in: studentIds } } });
    await tx.user.deleteMany({ where: { id: { in: studentIds } } });
  }
}

async function retireOmarFriday(tx: Transaction, tutorId: string, now: Date) {
  const obsoleteSeries = await tx.sessionSeries.findMany({
    where: { tutor_id: tutorId, weekday: 5, status: 'ACTIVE' },
    select: { id: true },
  });
  const seriesIds = obsoleteSeries.map(({ id }) => id);
  if (!seriesIds.length) return;

  const futureOccurrences = await tx.session.findMany({
    where: { series_id: { in: seriesIds }, start_time: { gt: now } },
    include: {
      attendances: { select: { id: true } },
      transactions: { select: { id: true } },
      tutor_compensation: { select: { id: true } },
      commission_entries: { select: { id: true } },
      attendance_recovery_grants: { select: { id: true } },
      participants: { select: { attendance_outcome: true } },
    },
  });
  for (const occurrence of futureOccurrences) {
    const hasHistory = occurrence.status !== 'SCHEDULED' || occurrence.attendances.length > 0 || occurrence.transactions.length > 0 ||
      occurrence.tutor_compensation !== null || occurrence.commission_entries.length > 0 ||
      occurrence.attendance_recovery_grants.length > 0 || occurrence.attendance_saved_at !== null ||
      occurrence.attendance_submitted_at !== null || occurrence.attendance_finalized_at !== null ||
      occurrence.admin_attendance_handled_at !== null || occurrence.attendance_notes !== null ||
      occurrence.admin_attendance_handling_note !== null || occurrence.participants.some(({ attendance_outcome }) => attendance_outcome !== null);
    if (hasHistory) {
      await tx.session.update({ where: { id: occurrence.id }, data: { status: 'CANCELLED', series_exception: true } });
    } else {
      await tx.session.delete({ where: { id: occurrence.id } });
    }
  }
  await tx.sessionSeries.deleteMany({ where: { id: { in: seriesIds } } });
}

async function retireChangedScheduleOccurrences(tx: Transaction, seriesId: string, now: Date) {
  const occurrences = await tx.session.findMany({
    where: { series_id: seriesId, start_time: { gt: now } },
    include: {
      attendances: { select: { id: true } },
      transactions: { select: { id: true } },
      tutor_compensation: { select: { id: true } },
      commission_entries: { select: { id: true } },
      attendance_recovery_grants: { select: { id: true } },
      participants: { select: { attendance_outcome: true } },
    },
  });
  for (const occurrence of occurrences) {
    const hasHistory = occurrence.status !== 'SCHEDULED' || occurrence.attendances.length > 0 || occurrence.transactions.length > 0 ||
      occurrence.tutor_compensation !== null || occurrence.commission_entries.length > 0 ||
      occurrence.attendance_recovery_grants.length > 0 || occurrence.attendance_saved_at !== null ||
      occurrence.attendance_submitted_at !== null || occurrence.attendance_finalized_at !== null ||
      occurrence.admin_attendance_handled_at !== null || occurrence.attendance_notes !== null ||
      occurrence.admin_attendance_handling_note !== null || occurrence.participants.some(({ attendance_outcome }) => attendance_outcome !== null);
    if (hasHistory) {
      await tx.session.update({ where: { id: occurrence.id }, data: { status: occurrence.status === 'SCHEDULED' ? 'CANCELLED' : occurrence.status, series_exception: true } });
    } else {
      await tx.session.delete({ where: { id: occurrence.id } });
    }
  }
}

async function removeDuplicateOccurrences(client: PrismaClient, seriesId: string) {
  const occurrences = await client.session.findMany({
    where: {
      series_id: seriesId,
      occurrence_date: { not: null },
      status: 'SCHEDULED',
      series_exception: false,
      historical_only: false,
      attendance_saved_at: null,
      attendance_submitted_at: null,
      attendance_finalized_at: null,
      admin_attendance_handled_at: null,
      attendances: { none: {} },
      transactions: { none: {} },
      participants: { every: { attendance_outcome: null } },
      tutor_compensation: { is: null },
      commission_entries: { none: {} },
      attendance_recovery_grants: { none: {} },
    },
    orderBy: [{ occurrence_date: 'asc' }, { created_at: 'asc' }],
    select: { id: true, occurrence_date: true },
  });
  const idsByDate = new Map<number, string[]>();
  for (const occurrence of occurrences) {
    const key = occurrence.occurrence_date!.getTime();
    idsByDate.set(key, [...(idsByDate.get(key) ?? []), occurrence.id]);
  }
  const duplicates = [...idsByDate.values()].flatMap((ids) => ids.slice(1));
  if (duplicates.length) await client.session.deleteMany({ where: { id: { in: duplicates } } });
}

async function ensureAdmin(tx: Transaction, passwordHash: string) {
  const matches = await tx.user.findMany({
    where: {
      role: 'ADMIN',
      OR: [{ email: 'admin@bigherorobotics.com' }, { phone: { in: [...legacyDemoPhoneNumbers] } }, { name: 'Sherif Admin' }],
    },
  });
  if (matches.length > 1) throw new Error('Multiple existing Admin identities match the canonical seed account');
  const existing = matches[0];
  const emailOwner = await tx.user.findUnique({ where: { email: 'admin@bigherorobotics.com' } });
  if (emailOwner && emailOwner.role !== 'ADMIN') throw new Error('Canonical Admin email belongs to a non-Admin account');
  if (existing) {
    return tx.user.update({
      where: { id: existing.id },
      data: {
        name: 'Sherif Admin',
        account_status: 'ACTIVE',
        password_hash: existing.password_hash ?? passwordHash,
        ...(existing.phone && legacyDemoPhoneNumbers.includes(existing.phone as (typeof legacyDemoPhoneNumbers)[number]) ? { phone: null } : {}),
      },
    });
  }
  return tx.user.create({
    data: {
      id: 'canonical-admin',
      name: 'Sherif Admin',
      email: 'admin@bigherorobotics.com',
      phone: null,
      password_hash: passwordHash,
      role: 'ADMIN',
      account_status: 'ACTIVE',
    },
  });
}

async function ensureTutor(tx: Transaction, tutor: (typeof canonicalTutors)[number], passwordHash: string) {
  const aliases = tutor.key === 'ahmed'
    ? ['Ahmed Alaa', 'Eng. Ahmed Alaa']
    : tutor.key === 'omar' ? ['Omar Ashraf', 'Eng. Omar Ashraf'] : ['Omnia Samy'];
  const matches = await tx.user.findMany({
    where: {
      role: 'TUTOR',
      OR: [
        { name: { in: aliases } },
        ...(tutor.email ? [{ email: tutor.email }] : []),
        ...(tutor.phone ? [{ phone: tutor.phone }] : []),
      ],
    },
  });
  if (matches.length > 1) throw new Error(`Multiple existing Tutor identities match ${tutor.name}; seed stopped without merging accounts`);
  if (matches.length === 1) {
    const existing = matches[0];
    return tx.user.update({
      where: { id: existing.id },
      data: {
        name: tutor.name,
        ...(existing.phone && legacyDemoPhoneNumbers.includes(existing.phone as (typeof legacyDemoPhoneNumbers)[number]) ? { phone: null } : {}),
      },
    });
  }
  return tx.user.create({
    data: {
      id: `canonical-tutor-${tutor.key}`,
      name: tutor.name,
      email: tutor.email,
      phone: tutor.phone,
      password_hash: tutor.email ? passwordHash : null,
      role: 'TUTOR',
      account_status: tutor.email ? 'ACTIVE' : 'PENDING_CREDENTIALS',
    },
  });
}

async function ensureStudent(tx: Transaction, student: (typeof canonicalStudents)[number], tutorIds: Map<SeedTutorKey, string>) {
  const candidates = new Map<string, Awaited<ReturnType<Transaction['user']['findUnique']>>>();
  if (student.phone) {
    const byPhone = await tx.user.findUnique({ where: { phone: student.phone } });
    if (byPhone) candidates.set(byPhone.id, byPhone);
  } else {
    const titles = canonicalSeries.filter(({ studentKeys }) => studentKeys.includes(student.key)).map(({ title }) => title);
    const mapped = await tx.sessionSeriesParticipant.findMany({
      where: {
        student: { role: 'STUDENT', name: student.name },
        series: { tutor_id: { in: [...tutorIds.values()] }, title: { in: titles } },
      },
      select: { student_id: true },
      distinct: ['student_id'],
    });
    for (const { student_id } of mapped) {
      const candidate = await tx.user.findUnique({ where: { id: student_id } });
      if (candidate) candidates.set(candidate.id, candidate);
    }
  }
  const deterministic = await tx.user.findUnique({ where: { id: `canonical-student-${student.key}` } });
  if (deterministic) candidates.set(deterministic.id, deterministic);
  if (candidates.size > 1) throw new Error(`Multiple existing Student identities match ${student.key}; seed stopped without merging accounts`);
  const existing = [...candidates.values()][0];
  if (existing && existing.role !== 'STUDENT') throw new Error(`Known Student contact belongs to a non-Student account: ${student.key}`);
  if (existing) return tx.user.update({ where: { id: existing.id }, data: { name: student.name } });
  return tx.user.create({
    data: {
      id: `canonical-student-${student.key}`,
      name: student.name,
      email: null,
      phone: student.phone ?? null,
      password_hash: null,
      role: 'STUDENT',
      account_status: student.profileIncomplete ? 'PENDING_PROFILE' : 'PENDING_CREDENTIALS',
    },
  });
}

export async function seedCanonicalDataset(client: PrismaClient = prisma) {
  const passwordHash = await bcrypt.hash(localPassword, 10);
  const now = new Date();
  const users = await client.$transaction(async (tx) => {
    await removePrototypeData(tx);
    const admin = await ensureAdmin(tx, passwordHash);
    const tutors = new Map<SeedTutorKey, string>();
    for (const tutor of canonicalTutors) tutors.set(tutor.key, (await ensureTutor(tx, tutor, passwordHash)).id);
    const students = new Map<string, string>();
    for (const student of canonicalStudents) students.set(student.key, (await ensureStudent(tx, student, tutors)).id);
    const seriesIds = new Map<string, string>();

    const omarId = tutors.get('omar');
    if (!omarId) throw new Error('Canonical Omar identity was not created');
    await retireOmarFriday(tx, omarId, now);
    await tx.platformPolicy.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', check_in_window_hours: 4 },
    });

    for (const assignment of canonicalSeries) {
      const tutorId = tutors.get(assignment.tutor);
      if (!tutorId) throw new Error(`Canonical Tutor is missing for ${assignment.key}`);
      const data = {
        title: assignment.title,
        tutor_id: tutorId,
        session_type: 'GROUP' as const,
        weekday: assignment.weekday,
        start_minute: assignment.startMinute,
        duration_minutes: assignment.durationMinutes,
        starts_on: startsOn,
        ends_on: null,
        status: 'ACTIVE' as const,
      };
      const prior = await tx.sessionSeries.findMany({ where: { tutor_id: tutorId, title: assignment.title }, select: { id: true } });
      if (prior.length > 1) throw new Error(`Duplicate existing series identity for ${assignment.key}; seed stopped without deleting history`);
      const seriesId = prior[0]?.id ?? `canonical-series-${assignment.key}`;
      const existingSeries = prior[0]
        ? await tx.sessionSeries.findUnique({ where: { id: seriesId }, select: { weekday: true, start_minute: true, duration_minutes: true } })
        : null;
      const slotWriter = (tx as unknown as OptionalSeriesSlotWriter).sessionSeriesSlot;
      const currentSlots = slotWriter
        ? await slotWriter.findMany({ where: { series_id: seriesId }, select: { id: true, weekday: true, start_minute: true, duration_minutes: true, active: true } })
        : [];
      const baseScheduleChanged = !!existingSeries && (
        existingSeries.weekday !== assignment.weekday || existingSeries.start_minute !== assignment.startMinute ||
        existingSeries.duration_minutes !== assignment.durationMinutes
      );
      const slotScheduleChanged = !!slotWriter && (
        currentSlots.length !== 1 || !currentSlots.some((slot) => slot.weekday === assignment.weekday && slot.start_minute === assignment.startMinute && slot.duration_minutes === assignment.durationMinutes)
      );
      if (baseScheduleChanged || slotScheduleChanged) await retireChangedScheduleOccurrences(tx, seriesId, now);
      await tx.sessionSeries.upsert({ where: { id: seriesId }, create: { id: seriesId, ...data }, update: data });
      seriesIds.set(assignment.key, seriesId);
      if (slotWriter) {
        let activeSlot = currentSlots.find((slot) => slot.weekday === assignment.weekday && slot.start_minute === assignment.startMinute && slot.duration_minutes === assignment.durationMinutes);
        if (!activeSlot) {
          await slotWriter.deleteMany({ where: { id: { in: currentSlots.map(({ id }) => id) } } });
          await slotWriter.create({
            data: {
              series_id: seriesId,
              weekday: assignment.weekday,
              start_minute: assignment.startMinute,
              duration_minutes: assignment.durationMinutes,
              timezone: 'Africa/Cairo',
              active: true,
            },
          });
        } else {
          if (!activeSlot.active) await slotWriter.update({ where: { id: activeSlot.id }, data: { active: true } });
          const staleSlotIds = currentSlots.filter(({ id }) => id !== activeSlot!.id).map(({ id }) => id);
          if (staleSlotIds.length) await slotWriter.deleteMany({ where: { id: { in: staleSlotIds } } });
        }
      }
      await tx.sessionSeriesParticipant.deleteMany({ where: { series_id: seriesId } });
      const participants = assignment.studentKeys.map((key) => {
        const studentId = students.get(key);
        if (!studentId) throw new Error(`Canonical Student is missing for ${assignment.key}: ${key}`);
        return { series_id: seriesId, student_id: studentId };
      });
      if (participants.length) await tx.sessionSeriesParticipant.createMany({ data: participants, skipDuplicates: true });
    }
    return { adminId: admin.id, tutors, students, seriesIds };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 20_000, timeout: 120_000 });

  const policy = await client.platformPolicy.findUniqueOrThrow({ where: { id: 'default' }, select: { check_in_window_hours: true } });
  const occurrenceCounts = new Map<string, number>();
  for (const assignment of canonicalSeries) {
    const seriesId = users.seriesIds.get(assignment.key);
    if (!seriesId) throw new Error(`Canonical SessionSeries is missing for ${assignment.key}`);
    occurrenceCounts.set(seriesId, await materializeSessionSeries(seriesId, { checkInWindowHours: policy.check_in_window_hours }, now));
    await removeDuplicateOccurrences(client, seriesId);
    const occurrences = await client.session.findMany({
      where: {
        series_id: seriesId,
        status: 'SCHEDULED',
        series_exception: false,
        historical_only: false,
        attendance_saved_at: null,
        attendance_submitted_at: null,
        attendance_finalized_at: null,
        admin_attendance_handled_at: null,
        attendances: { none: {} },
        transactions: { none: {} },
      },
      select: { id: true },
    });
    const occurrenceIds = occurrences.map(({ id }) => id);
    if (occurrenceIds.length) {
      await client.sessionParticipant.deleteMany({ where: { session_id: { in: occurrenceIds } } });
      const rows = occurrenceIds.flatMap((session_id) => assignment.studentKeys.map((key) => ({
        session_id,
        student_id: users.students.get(key)!,
      })));
      if (rows.length) await client.sessionParticipant.createMany({ data: rows, skipDuplicates: true });
    }
  }

  return {
    adminId: users.adminId,
    tutorIds: Object.fromEntries(users.tutors),
    studentIds: Object.fromEntries(users.students),
    seriesIds: Object.fromEntries(users.seriesIds),
    studentCount: users.students.size,
    seriesCount: canonicalSeries.length,
    materializedOccurrences: [...occurrenceCounts.values()].reduce((sum, count) => sum + count, 0),
  };
}

if (process.env.RUN_CANONICAL_SEED === '1') {
  void seedCanonicalDataset()
    .then((result) => console.log(JSON.stringify({ seeded: true, ...result })))
    .catch((error) => {
      console.error('Canonical development seed failed:', error instanceof Error ? error.message : 'unknown error');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
