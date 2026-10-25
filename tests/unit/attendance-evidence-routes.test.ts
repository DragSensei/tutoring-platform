import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  sessionFindFirst: vi.fn(),
  evidenceFindFirst: vi.fn(),
  evidenceFindUnique: vi.fn(),
  evidenceUpdateMany: vi.fn(),
  evidenceCreate: vi.fn(),
  evidenceDeleteMany: vi.fn(),
  transaction: vi.fn(),
  storageGet: vi.fn(),
  storagePut: vi.fn(),
  storageDelete: vi.fn(),
}));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: {
  $transaction: mocks.transaction,
  session: { findFirst: mocks.sessionFindFirst },
  platformPolicy: { findUnique: vi.fn() },
  attendanceRecoveryGrant: { findFirst: vi.fn() },
  attendanceEvidence: { findFirst: mocks.evidenceFindFirst, findUnique: mocks.evidenceFindUnique, updateMany: mocks.evidenceUpdateMany, create: mocks.evidenceCreate, deleteMany: mocks.evidenceDeleteMany },
} }));
vi.mock('@/features/attendance/server/evidence-storage', () => ({ getAttendanceEvidenceStorage: () => ({
  get: mocks.storageGet, put: mocks.storagePut, delete: mocks.storageDelete,
}) }));

const { POST, DELETE } = await import('@/app/api/tutor/attendance/evidence/route');
const { GET } = await import('@/app/api/admin/attendance/evidence/[evidenceId]/route');

describe('attendance evidence access routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const session = { id: 'session-1', start_time: new Date(Date.now() - 60_000), end_time: new Date(Date.now() + 60_000), status: 'SCHEDULED', historical_only: false, attendance_submitted_at: null, attendance_finalized_at: null };
    mocks.requireAuth.mockResolvedValue({ userId: 'tutor-1', role: 'TUTOR' });
    mocks.sessionFindFirst.mockResolvedValue(session);
    mocks.evidenceFindUnique.mockResolvedValue(null);
    mocks.storagePut.mockResolvedValue(undefined);
    mocks.storageDelete.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation((callback) => callback({
      session: { findFirst: vi.fn().mockResolvedValue(session) },
      attendanceEvidence: { findUnique: mocks.evidenceFindUnique, updateMany: mocks.evidenceUpdateMany, create: mocks.evidenceCreate },
    }));
  });

  function uploadRequest() {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(bytes.buffer).setUint32(16, 1);
    new DataView(bytes.buffer).setUint32(20, 1);
    return new NextRequest('http://localhost:3000/api/tutor/attendance/evidence?sessionId=session-1', {
      method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'image/png' }, body: Buffer.from(bytes),
    });
  }

  it('rejects evidence submitted while storage upload was in flight and removes only the new blob', async () => {
    const oldKey = 'sessions/session-1/accepted-evidence';
    mocks.storagePut.mockImplementation(async () => {
      mocks.evidenceFindUnique.mockResolvedValue({ id: 'evidence-1', session_id: 'session-1', uploaded_by_user_id: 'tutor-1', storage_key: oldKey, submitted_at: new Date() });
    });

    const response = await POST(uploadRequest());

    expect(response.status).toBe(409);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(mocks.storageDelete).toHaveBeenCalledTimes(1);
    expect(mocks.storageDelete).toHaveBeenCalledWith(expect.stringMatching(/^sessions\/session-1\//));
    expect(mocks.storageDelete).not.toHaveBeenCalledWith(oldKey);
    expect(mocks.evidenceUpdateMany).not.toHaveBeenCalled();
  });

  it('preserves existing evidence when its conditional replacement claim loses a race', async () => {
    const oldKey = 'sessions/session-1/pending-evidence';
    mocks.evidenceFindUnique.mockResolvedValue({ id: 'evidence-1', session_id: 'session-1', uploaded_by_user_id: 'tutor-1', storage_key: oldKey, submitted_at: null });
    mocks.evidenceUpdateMany.mockResolvedValue({ count: 0 });

    const response = await POST(uploadRequest());

    expect(response.status).toBe(409);
    expect(mocks.evidenceUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'evidence-1', uploaded_by_user_id: 'tutor-1', submitted_at: null } }));
    expect(mocks.storageDelete).toHaveBeenCalledTimes(1);
    expect(mocks.storageDelete).not.toHaveBeenCalledWith(oldKey);
  });

  it('returns the stored evidence identity when another upload created the row first', async () => {
    mocks.evidenceFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'winner-evidence', uploaded_by_user_id: 'tutor-1', storage_key: 'sessions/session-1/previous', submitted_at: null });
    mocks.evidenceUpdateMany.mockResolvedValue({ count: 1 });
    const response = await POST(uploadRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ evidenceId: 'winner-evidence' });
    expect(mocks.storageDelete).toHaveBeenCalledWith('sessions/session-1/previous');
  });

  it('rejects a delete whose pending object was replaced and preserves its blob', async () => {
    mocks.evidenceFindFirst.mockResolvedValue({ id: 'evidence-1', storage_key: 'sessions/session-1/previous', submitted_at: null });
    mocks.evidenceDeleteMany.mockResolvedValue({ count: 0 });
    const response = await DELETE(new NextRequest('http://localhost:3000/api/tutor/attendance/evidence?evidenceId=evidence-1', { method: 'DELETE', headers: { origin: 'http://localhost:3000' } }));
    expect(response.status).toBe(409);
    expect(mocks.evidenceDeleteMany).toHaveBeenCalledWith({ where: { id: 'evidence-1', uploaded_by_user_id: 'tutor-1', submitted_at: null, storage_key: 'sessions/session-1/previous' } });
    expect(mocks.storageDelete).not.toHaveBeenCalled();
  });

  it('rejects cross-origin uploads before authentication or database access', async () => {
    const request = new NextRequest('http://localhost:3000/api/tutor/attendance/evidence?sessionId=session-1', {
      method: 'POST', headers: { origin: 'https://attacker.example' },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(mocks.requireAuth).not.toHaveBeenCalled();
    expect(mocks.sessionFindFirst).not.toHaveBeenCalled();
  });

  it('requires Admin authorization before looking up screenshot evidence', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'));
    const response = await GET(new Request('http://localhost/api/admin/attendance/evidence/evidence-1'), { params: { evidenceId: 'evidence-1' } });
    expect(response.status).toBe(401);
    expect(mocks.evidenceFindFirst).not.toHaveBeenCalled();
    expect(mocks.storageGet).not.toHaveBeenCalled();
  });

  it('serves only submitted evidence with private no-store image headers and verifies its digest', async () => {
    const bytes = new TextEncoder().encode('private screenshot bytes');
    mocks.requireAuth.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.evidenceFindFirst.mockResolvedValue({ storage_key: 'sessions/session-1/evidence-1', content_type: 'image/png', size_bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
    mocks.storageGet.mockResolvedValue(bytes);
    const response = await GET(new Request('http://localhost/api/admin/attendance/evidence/evidence-1'), { params: { evidenceId: 'evidence-1' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain('sandbox');
    expect(mocks.evidenceFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'evidence-1', submitted_at: { not: null } } }));
    expect(mocks.storageGet).toHaveBeenCalledWith('sessions/session-1/evidence-1');
  });
});
