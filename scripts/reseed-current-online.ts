/** Local-only, PII-free importer. Read the ignored .local/current-online-schedule.json manifest. */
import fs from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { collectPrismaPages } from '../src/shared/lib/prisma-pagination';

loadEnvConfig(process.cwd());

type Person = { key: string; name: string; phone?: string; email?: string; identityKey: string; guardianName?: string; identityIncomplete?: boolean };
type Slot = { weekday: number; startMinute: number; durationMinutes: number };
type Group = { key: string; title: string; programCode: 'P1' | 'P3' | 'P4' | 'P5'; courseName?: string; level?: number | null; tutorKey: string; studentKeys: string[]; weeklySlots: Slot[] };
type Manifest = { timezone: 'Africa/Cairo'; tutors: Person[]; students: Person[]; groups: Group[] };

function fail(message: string): never { throw new Error(`Manifest rejected: ${message}`); }
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) fail(`duplicate ${label}`);
}
function validateManifest(raw: unknown): Manifest {
  if (!raw || typeof raw !== 'object') fail('invalid document');
  const manifest = raw as Manifest;
  if (manifest.timezone !== 'Africa/Cairo') fail('timezone must be Africa/Cairo');
  if (!Array.isArray(manifest.tutors) || !Array.isArray(manifest.students) || !Array.isArray(manifest.groups)) fail('people and groups arrays required');
  const people = [...manifest.tutors, ...manifest.students];
  for (const person of people) {
    if (!person.key || !person.name || !person.identityKey) fail('every person needs a key, known name, and source identity');
    if (person.phone && !/^\+[1-9]\d{6,14}$/.test(person.phone)) fail(`invalid direct phone for ${person.key}`);
    if (person.guardianName?.trim().toLocaleLowerCase() === person.name.trim().toLocaleLowerCase()) fail(`parent named as Student: ${person.key}`);
  }
  unique(people.map((person) => person.key), 'person key');
  unique(manifest.students.map((person) => person.identityKey), 'Student identity');
  unique(people.filter((person) => person.phone).map((person) => person.phone!), 'direct phone');
  const forbiddenTutor = /^(?:sherif admin|you|hossam(?: zayed)?)$/i;
  if (manifest.tutors.some((tutor) => forbiddenTutor.test(tutor.name.trim()))) fail('Admin or staff member listed as Tutor');
  const tutorKeys = new Set(manifest.tutors.map((person) => person.key));
  const studentKeys = new Set(manifest.students.map((person) => person.key));
  unique(manifest.groups.map((group) => group.key), 'group key');
  const cohorts: string[] = [];
  for (const group of manifest.groups) {
    if (!group.key || !group.title || !['P1', 'P3', 'P4', 'P5'].includes(group.programCode)) fail(`invalid program or group identity: ${group.key}`);
    if (!tutorKeys.has(group.tutorKey)) fail(`missing Tutor for ${group.key}`);
    if (!Array.isArray(group.studentKeys) || group.studentKeys.length < 1 || !group.studentKeys.every((key) => studentKeys.has(key))) fail(`invalid roster for ${group.key}`);
    unique(group.studentKeys, `roster in ${group.key}`);
    if (!Array.isArray(group.weeklySlots) || group.weeklySlots.length < 1 || group.weeklySlots.length > 14) fail(`weekly slots missing for ${group.key}`);
    for (const [index, slot] of group.weeklySlots.entries()) {
      if (!Number.isInteger(slot.weekday) || slot.weekday < 0 || slot.weekday > 6 || !Number.isInteger(slot.startMinute) || !Number.isInteger(slot.durationMinutes) || slot.startMinute < 0 || slot.durationMinutes < 30 || slot.startMinute + slot.durationMinutes > 1440) fail(`invalid weekly time in ${group.key}`);
      if (group.weeklySlots.some((other, otherIndex) => otherIndex < index && other.weekday === slot.weekday && slot.startMinute < other.startMinute + other.durationMinutes && other.startMinute < slot.startMinute + slot.durationMinutes)) fail(`overlapping weekly times in ${group.key}`);
    }
    cohorts.push([group.programCode, group.courseName ?? '', group.level ?? '', group.tutorKey, [...group.studentKeys].sort().join(',')].join('|'));
  }
  unique(cohorts, 'logical cohort split across groups');
  return manifest;
}

function provenLocalTarget() {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) throw new Error('Local DATABASE_URL and DIRECT_URL are required');
  for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
    const target = new URL(value);
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname.toLowerCase()) || decodeURIComponent(target.pathname.slice(1)) !== 'tutoring_platform_db') throw new Error('Target is not the proven loopback development database');
  }
  if (!process.env.TEST_DATABASE_URL || decodeURIComponent(new URL(process.env.TEST_DATABASE_URL).pathname.slice(1)) !== 'tutoring_platform_test') throw new Error('Isolated test database identity is not proven');
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') throw new Error('Environment is not local development');
  for (const marker of ['APP_ENV', 'DEPLOY_ENV', 'VERCEL_ENV']) {
    const value = process.env[marker]?.toLowerCase();
    if (value && !['local', 'development'].includes(value)) throw new Error('Environment is not local development');
  }
}

const file = path.resolve(process.cwd(), '.local/current-online-schedule.json');
const manifest = validateManifest(JSON.parse(fs.readFileSync(file, 'utf8')));
provenLocalTarget();
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');
if (apply && verify) throw new Error('Choose either --apply or --verify');

async function main() {
  const [identity] = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  if (identity?.database !== 'tutoring_platform_db') throw new Error('Connected database identity mismatch');
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true, phone: true, password_hash: true, account_status: true }, take: 2 });
  if (admins.length !== 1 || admins[0].account_status !== 'ACTIVE' || !admins[0].password_hash || !(admins[0].email || admins[0].phone)) throw new Error('Existing Admin identity is ambiguous or cannot sign in');
  const weeklySlots = manifest.groups.reduce((count, group) => count + group.weeklySlots.length, 0);
  console.log(JSON.stringify({ target: 'LOCAL DEVELOPMENT/tutoring_platform_db', mode: apply ? 'APPLY' : verify ? 'VERIFY' : 'DRY_RUN', adminPreserved: true, logicalGroups: manifest.groups.length, weeklySlots, students: manifest.students.length, tutors: manifest.tutors.length }));
  if (verify) {
    const { materializeSessionSeriesWithClient } = await import('../src/features/sessions/server/recurrence');
    const [before, ids, policy] = await Promise.all([
      prisma.session.count(), collectPrismaPages((cursorId) => prisma.sessionSeries.findMany({ select: { id: true }, orderBy: { id: 'asc' }, take: 200, cursor: cursorId ? { id: cursorId } : undefined, skip: cursorId ? 1 : 0 })),
      prisma.platformPolicy.findUnique({ where: { id: 'default' }, select: { check_in_window_hours: true } }),
    ]);
    for (let repeat = 0; repeat < 2; repeat++) {
      for (const { id } of ids) await materializeSessionSeriesWithClient(prisma, id, { checkInWindowHours: policy?.check_in_window_hours ?? 4 });
    }
    const after = await prisma.session.count();
    if (after !== before) throw new Error('Repeated materialization changed the occurrence count');
    console.log(JSON.stringify({ idempotent: true, occurrencesBefore: before, occurrencesAfter: after }));
    return;
  }
  if (!apply) return;
  const { academyCalendarDate, materializeSessionSeriesWithClient } = await import('../src/features/sessions/server/recurrence');
  const startsOn = academyCalendarDate(new Date());
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const currentAdmins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true, phone: true, password_hash: true, account_status: true }, take: 2 });
    if (currentAdmins.length !== 1 || JSON.stringify(currentAdmins[0]) !== JSON.stringify(admins[0])) throw new Error('Admin identity changed before reset');
    await tx.studentMonthlyReceivable.deleteMany();
    await tx.commissionLedgerEntry.deleteMany();
    await tx.tutorCompensationLedgerEntry.deleteMany();
    await tx.payoutSettlement.updateMany({ data: { reversal_of_id: null } });
    await tx.payoutSettlement.deleteMany();
    await tx.walletTransaction.deleteMany();
    await tx.attendanceRecoveryGrant.deleteMany();
    await tx.attendanceRecord.deleteMany();
    await tx.sessionParticipant.deleteMany();
    await tx.session.deleteMany();
    await tx.sessionSeriesParticipant.deleteMany();
    await tx.sessionSeries.deleteMany();
    await tx.linkedStudentRelationship.deleteMany();
    await tx.studentImportRow.deleteMany();
    await tx.studentImportBatch.deleteMany();
    await tx.accountSetupToken.deleteMany({ where: { user: { role: { not: 'ADMIN' } } } });
    await tx.wallet.deleteMany();
    await tx.platformPolicy.updateMany({ where: { commission_updated_by_user_id: { not: admins[0].id } }, data: { commission_updated_by_user_id: null } });
    await tx.user.deleteMany({ where: { role: { not: 'ADMIN' } } });

    const users = new Map<string, string>();
    for (const tutor of manifest.tutors) {
      const user = await tx.user.create({ data: { name: tutor.name, email: tutor.email ?? null, phone: tutor.phone ?? null, role: 'TUTOR', account_status: 'PENDING_CREDENTIALS', password_hash: null } });
      users.set(tutor.key, user.id);
    }
    for (const student of manifest.students) {
      const user = await tx.user.create({ data: { name: student.name, email: student.email ?? null, phone: student.phone ?? null, role: 'STUDENT', account_status: student.identityIncomplete ? 'PENDING_PROFILE' : 'PENDING_CREDENTIALS', password_hash: null, wallet: { create: { balance: new Prisma.Decimal(0), is_flagged_overdraft: false } } } });
      users.set(student.key, user.id);
    }
    const seriesIds: string[] = [];
    for (const group of manifest.groups) {
      const first = group.weeklySlots[0];
      const series = await tx.sessionSeries.create({ data: {
        title: group.title, tutor_id: users.get(group.tutorKey)!, session_type: 'GROUP',
        program_code: group.programCode, course_name: group.courseName ?? null, level: group.level ?? null,
        weekday: first.weekday, start_minute: first.startMinute, duration_minutes: first.durationMinutes, starts_on: startsOn,
        participants: { create: group.studentKeys.map((key) => ({ student_id: users.get(key)! })) },
        slots: { create: group.weeklySlots.map((slot) => ({ weekday: slot.weekday, start_minute: slot.startMinute, duration_minutes: slot.durationMinutes })) },
      } });
      seriesIds.push(series.id);
    }
    const policy = await tx.platformPolicy.findUnique({ where: { id: 'default' }, select: { check_in_window_hours: true } });
    for (const id of seriesIds) await materializeSessionSeriesWithClient(tx, id, { checkInWindowHours: policy?.check_in_window_hours ?? 4 }, now);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 20_000, timeout: 120_000 });
  const [seriesCount, sessionCount, studentCount, tutorCount] = await Promise.all([
    prisma.sessionSeries.count(), prisma.session.count(), prisma.user.count({ where: { role: 'STUDENT' } }), prisma.user.count({ where: { role: 'TUTOR' } }),
  ]);
  console.log(JSON.stringify({ seeded: true, logicalGroups: seriesCount, weeklySlots, materializedOccurrences: sessionCount, students: studentCount, tutors: tutorCount }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Local reseed failed'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
