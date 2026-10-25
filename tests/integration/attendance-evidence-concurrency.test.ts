import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for database-backed integration tests');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), storagePut: vi.fn(), storageDelete: vi.fn() }));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/features/attendance/server/evidence-storage', () => ({ getAttendanceEvidenceStorage: () => ({
  get: vi.fn(), put: mocks.storagePut, delete: mocks.storageDelete,
}) }));

const { prisma } = await import('@/shared/lib/prisma');
const { POST } = await import('@/app/api/tutor/attendance/evidence/route');

const prefix = `test-evidence-concurrency-${process.pid}-${Date.now()}-`;
let counter = 0;
let originalCheckWindow: number | null = null;
const png = new Uint8Array(24);
png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
new DataView(png.buffer).setUint32(16, 1);
new DataView(png.buffer).setUint32(20, 1);
const sha256 = createHash('sha256').update(png).digest('hex');

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function createFixture(withPendingEvidence = false) {
  const marker = `${prefix}${counter++}`;
  const tutor = await prisma.user.create({ data: {
    name: `Evidence tutor ${marker}`, email: `${marker}-tutor@example.com`, phone: `+20${Date.now()}${counter}`, password_hash: 'test', role: 'TUTOR',
  } });
  const student = await prisma.user.create({ data: {
    name: `Evidence student ${marker}`, email: `${marker}-student@example.com`, phone: `+20${Date.now()}${counter + 1}`, password_hash: 'test', role: 'STUDENT',
  } });
  const now = new Date();
  const session = await prisma.session.create({ data: {
    title: `Evidence concurrency ${marker}`, tutor_id: tutor.id, session_type: 'GROUP',
    start_time: new Date(now.getTime() - 3 * 60 * 60 * 1000), end_time: new Date(now.getTime() - 60 * 60 * 1000),
    deadline: new Date(now.getTime() + 3 * 60 * 60 * 1000), participants: { create: [{ student_id: student.id }] },
  } });
  const evidence = withPendingEvidence ? await prisma.attendanceEvidence.create({ data: {
    session_id: session.id, uploaded_by_user_id: tutor.id, storage_key: `test/${session.id}/accepted-original`,
    content_type: 'image/png', size_bytes: png.byteLength, sha256,
  } }) : null;
  return { tutor, session, evidence };
}

async function cleanup() {
  const sessions = await prisma.session.findMany({ where: { title: { startsWith: `Evidence concurrency ${prefix}` } }, select: { id: true } });
  if (sessions.length) {
    const ids = sessions.map(({ id }) => id);
    await prisma.attendanceEvidence.deleteMany({ where: { session_id: { in: ids } } });
    await prisma.sessionParticipant.deleteMany({ where: { session_id: { in: ids } } });
    await prisma.session.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
}

function uploadRequest(sessionId: string) {
  return new NextRequest(`http://localhost:3000/api/tutor/attendance/evidence?sessionId=${sessionId}`, {
    method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'image/png' }, body: Buffer.from(png),
  });
}

describe('attendance evidence database concurrency', () => {
  beforeAll(async () => {
    await cleanup();
    const original = await prisma.platformPolicy.findUnique({ where: { id: 'default' }, select: { check_in_window_hours: true } });
    originalCheckWindow = original?.check_in_window_hours ?? null;
    await prisma.platformPolicy.upsert({
      where: { id: 'default' }, update: { check_in_window_hours: 4 }, create: { id: 'default', check_in_window_hours: 4, group_session_price: 375, private_session_price: 500, allow_overdraft: true },
    });
  });

  afterAll(async () => {
    await cleanup();
    if (originalCheckWindow === null) await prisma.platformPolicy.delete({ where: { id: 'default' } });
    else await prisma.platformPolicy.update({ where: { id: 'default' }, data: { check_in_window_hours: originalCheckWindow } });
    await prisma.$disconnect();
  });

  it('rejects an upload when attendance is submitted while storage is paused and preserves accepted evidence', async () => {
    const fixture = await createFixture(true);
    const stored = deferred();
    const release = deferred();
    mocks.requireAuth.mockResolvedValue({ userId: fixture.tutor.id, role: 'TUTOR' });
    mocks.storageDelete.mockResolvedValue(undefined);
    mocks.storagePut.mockImplementation(async () => { stored.resolve(); await release.promise; });

    const responsePromise = POST(uploadRequest(fixture.session.id));
    await stored.promise;
    const submittedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.attendanceEvidence.update({ where: { id: fixture.evidence!.id }, data: { submitted_at: submittedAt } });
      await tx.session.update({ where: { id: fixture.session.id }, data: { attendance_submitted_at: submittedAt } });
    });
    release.resolve();
    const response = await responsePromise;

    expect(response.status).toBe(409);
    const persisted = await prisma.attendanceEvidence.findUniqueOrThrow({ where: { session_id: fixture.session.id } });
    expect(persisted).toMatchObject({
      id: fixture.evidence!.id, storage_key: fixture.evidence!.storage_key, sha256: fixture.evidence!.sha256, submitted_at: submittedAt,
    });
    expect(mocks.storageDelete).toHaveBeenCalledTimes(1);
    expect(mocks.storageDelete.mock.calls[0][0]).toMatch(new RegExp(`^sessions/${fixture.session.id}/`));
    expect(mocks.storageDelete).not.toHaveBeenCalledWith(fixture.evidence!.storage_key);
  });

  it('keeps concurrent first uploads on one persisted evidence identity', async () => {
    const fixture = await createFixture();
    const bothStored = deferred();
    const release = deferred();
    let putCount = 0;
    mocks.requireAuth.mockResolvedValue({ userId: fixture.tutor.id, role: 'TUTOR' });
    mocks.storageDelete.mockResolvedValue(undefined);
    mocks.storagePut.mockImplementation(async () => {
      putCount += 1;
      if (putCount === 2) bothStored.resolve();
      await release.promise;
    });

    const uploads = [POST(uploadRequest(fixture.session.id)), POST(uploadRequest(fixture.session.id))];
    await bothStored.promise;
    release.resolve();
    const responses = await Promise.all(uploads);
    const statuses = responses.map(({ status }) => status);
    expect(statuses.filter((status) => status === 201).length).toBeGreaterThanOrEqual(1);
    expect(statuses.every((status) => status === 201 || status === 409)).toBe(true);

    const evidenceRows = await prisma.attendanceEvidence.findMany({ where: { session_id: fixture.session.id } });
    expect(evidenceRows).toHaveLength(1);
    const persistedId = evidenceRows[0].id;
    const successfulIds = await Promise.all(responses.map(async (response) => response.status === 201 ? (await response.json()).evidenceId as string : null));
    expect(successfulIds.filter(Boolean).every((id) => id === persistedId)).toBe(true);
    expect(mocks.storageDelete).not.toHaveBeenCalledWith(evidenceRows[0].storage_key);
    expect(evidenceRows[0].storage_key).toMatch(new RegExp(`^sessions/${fixture.session.id}/`));
  });
});