import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { finalizeDueAttendance } from '@/features/attendance/server/finalize-due-attendance';

export const dynamic = 'force-dynamic';

function secretsMatch(providedSecret: string, configuredSecret: string) {
  const provided = createHash('sha256').update(providedSecret).digest();
  const configured = createHash('sha256').update(configuredSecret).digest();
  return timingSafeEqual(provided, configured);
}

function getProvidedSecret(request: NextRequest) {
  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret) return headerSecret;

  const authorization = request.headers.get('authorization');
  const bearerMatch = authorization?.match(/^Bearer[ \t]+(\S+)$/i);
  return bearerMatch?.[1];
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = getProvidedSecret(request);

  if (!configuredSecret) {
    return NextResponse.json({ message: 'Finalizer trigger is not configured' }, { status: 503 });
  }
  if (!providedSecret || !secretsMatch(providedSecret, configuredSecret)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await finalizeDueAttendance(await getPlatformPolicies());
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Attendance finalization failed' }, { status: 500 });
  }
}
