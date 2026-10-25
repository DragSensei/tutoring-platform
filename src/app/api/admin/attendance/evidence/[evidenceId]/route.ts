import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { requireAuth } from '@/features/auth/server/session';
import { getAttendanceEvidenceStorage } from '@/features/attendance/server/evidence-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { evidenceId: string } }) {
  try { await requireAuth(['ADMIN']); }
  catch { return NextResponse.json({ message: 'Admin authentication is required.' }, { status: 401 }); }
  const evidence = await prisma.attendanceEvidence.findFirst({
    where: { id: params.evidenceId, submitted_at: { not: null } },
    select: { storage_key: true, content_type: true, size_bytes: true, sha256: true },
  });
  if (!evidence) return NextResponse.json({ message: 'Evidence was not found.' }, { status: 404 });
  try {
    const bytes = await getAttendanceEvidenceStorage().get(evidence.storage_key);
    if (!bytes || bytes.byteLength !== evidence.size_bytes || createHash('sha256').update(bytes).digest('hex') !== evidence.sha256) {
      return NextResponse.json({ message: 'Evidence could not be verified.' }, { status: 404 });
    }
    return new NextResponse(bytes as unknown as BodyInit, { status: 200, headers: {
      'Content-Type': evidence.content_type,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': 'inline; filename="attendance-evidence.webp"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Referrer-Policy': 'no-referrer',
    } });
  } catch {
    return NextResponse.json({ message: 'Evidence could not be loaded.' }, { status: 500 });
  }
}
