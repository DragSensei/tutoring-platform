import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAuth } from '@/features/auth/server/session';
import { getAttendanceEvidenceStorage } from '@/features/attendance/server/evidence-storage';
import { EvidenceValidationError, MAX_ATTENDANCE_EVIDENCE_BYTES, validateAttendanceEvidence } from '@/features/attendance/server/evidence-validation';
import { computeAttendanceClosesAt, CHECKIN_WINDOW_HOURS } from '@/shared/utils/deadline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

class EvidenceConflictError extends Error {}

function sameOrigin(request: NextRequest) {
  try { return new URL(request.headers.get('origin') || '').origin === request.nextUrl.origin; }
  catch { return false; }
}

async function readBoundedBody(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ATTENDANCE_EVIDENCE_BYTES) throw new EvidenceValidationError('Screenshot must be 5 MB or smaller.');
  if (!request.body) throw new EvidenceValidationError('Screenshot body is missing.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ATTENDANCE_EVIDENCE_BYTES) {
        await reader.cancel();
        throw new EvidenceValidationError('Screenshot must be 5 MB or smaller.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: 'Same-origin upload required.' }, { status: 403 });
  let actor: { userId: string };
  try { actor = await requireAuth(['TUTOR']); }
  catch { return NextResponse.json({ message: 'Tutor authentication is required.' }, { status: 401 }); }
  const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim();
  if (!sessionId || sessionId.length > 128) return NextResponse.json({ message: 'A valid Session is required.' }, { status: 400 });

  const session = await prisma.session.findFirst({
    where: { id: sessionId, tutor_id: actor.userId },
    select: { id: true, start_time: true, end_time: true, status: true, historical_only: true, attendance_submitted_at: true, attendance_finalized_at: true },
  });
  if (!session || session.historical_only || session.status === 'CANCELLED') return NextResponse.json({ message: 'Session not found.' }, { status: 404 });
  if (session.attendance_submitted_at || session.attendance_finalized_at) return NextResponse.json({ message: 'Submitted attendance cannot be changed.' }, { status: 409 });
  const now = new Date();
  const policy = await prisma.platformPolicy.findUnique({ where: { id: 'default' }, select: { check_in_window_hours: true } });
  const close = computeAttendanceClosesAt(session.end_time, policy?.check_in_window_hours ?? CHECKIN_WINDOW_HOURS);
  const recovery = await prisma.attendanceRecoveryGrant.findFirst({ where: { session_id: session.id, used_at: null, opened_at: { lte: now }, closes_at: { gte: now } }, select: { id: true } });
  if (!(now >= session.start_time && now <= close) && !recovery) return NextResponse.json({ message: 'The attendance evidence window is closed.' }, { status: 403 });

  try {
    const bytes = await readBoundedBody(request);
    const declaredType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
    const validated = validateAttendanceEvidence(bytes, declaredType);
    const existing = await prisma.attendanceEvidence.findUnique({ where: { session_id: session.id } });
    if (existing?.submitted_at) return NextResponse.json({ message: 'Submitted attendance evidence cannot be replaced.' }, { status: 409 });
    if (existing && existing.uploaded_by_user_id !== actor.userId) return NextResponse.json({ message: 'Evidence upload is not authorized.' }, { status: 403 });

    const evidenceId = existing?.id ?? randomUUID();
    const storageKey = `sessions/${session.id}/${randomUUID()}`;
    const storage = getAttendanceEvidenceStorage();
    await storage.put(storageKey, bytes, validated.contentType);
    let persistedEvidence: { id: string; replacedStorageKey?: string };
    try {
      persistedEvidence = await prisma.$transaction(async (tx) => {
        const currentSession = await tx.session.findFirst({
          where: { id: session.id, tutor_id: actor.userId },
          select: { id: true, historical_only: true, status: true, attendance_submitted_at: true, attendance_finalized_at: true },
        });
        if (!currentSession || currentSession.historical_only || currentSession.status === 'CANCELLED') throw new EvidenceConflictError();
        if (currentSession.attendance_submitted_at || currentSession.attendance_finalized_at) throw new EvidenceConflictError();

        const current = await tx.attendanceEvidence.findUnique({ where: { session_id: session.id } });
        if (current?.submitted_at || (current && current.uploaded_by_user_id !== actor.userId)) throw new EvidenceConflictError();
        if (current) {
          const claimed = await tx.attendanceEvidence.updateMany({
            where: { id: current.id, uploaded_by_user_id: actor.userId, submitted_at: null },
            data: { storage_key: storageKey, content_type: validated.contentType, size_bytes: bytes.byteLength, sha256: validated.sha256, created_at: now },
          });
          if (claimed.count !== 1) throw new EvidenceConflictError();
          return { id: current.id, replacedStorageKey: current.storage_key };
        }
        await tx.attendanceEvidence.create({
          data: { id: evidenceId, session_id: session.id, uploaded_by_user_id: actor.userId, storage_key: storageKey, content_type: validated.contentType, size_bytes: bytes.byteLength, sha256: validated.sha256 },
        });
        return { id: evidenceId };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      await storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    if (persistedEvidence.replacedStorageKey) await storage.delete(persistedEvidence.replacedStorageKey).catch(() => undefined);
    return NextResponse.json({ evidenceId: persistedEvidence.id }, { status: 201 });
  } catch (error) {
    if (error instanceof EvidenceValidationError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof EvidenceConflictError || (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code)))) {
      return NextResponse.json({ message: 'Attendance evidence changed while uploading. Please retry.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Screenshot upload failed.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: 'Same-origin request required.' }, { status: 403 });
  let actor: { userId: string };
  try { actor = await requireAuth(['TUTOR']); }
  catch { return NextResponse.json({ message: 'Tutor authentication is required.' }, { status: 401 }); }
  const id = request.nextUrl.searchParams.get('evidenceId')?.trim();
  if (!id || id.length > 128) return NextResponse.json({ message: 'Evidence was not found.' }, { status: 404 });
  const evidence = await prisma.attendanceEvidence.findFirst({ where: { id, uploaded_by_user_id: actor.userId }, select: { id: true, storage_key: true, submitted_at: true } });
  if (!evidence) return NextResponse.json({ message: 'Evidence was not found.' }, { status: 404 });
  if (evidence.submitted_at) return NextResponse.json({ message: 'Submitted attendance evidence cannot be removed.' }, { status: 409 });
  const removed = await prisma.attendanceEvidence.deleteMany({ where: { id: evidence.id, uploaded_by_user_id: actor.userId, submitted_at: null, storage_key: evidence.storage_key } });
  if (removed.count !== 1) return NextResponse.json({ message: 'Evidence could not be removed.' }, { status: 409 });
  await getAttendanceEvidenceStorage().delete(evidence.storage_key);
  return NextResponse.json({ removed: true });
}
