'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/date-format';
import { formatRecoveryTimeRemaining, isRecoveryWindowActive } from '../utils/recovery-time';

export interface TutorRecoveryGrantNotice {
  id: string;
  openedAt: string;
  closesAt: string;
  adminName?: string;
  adminReason?: string;
  observedAt?: string;
}

export function AttendanceRecoveryAlert({
  title,
  sessionId,
  grant,
  href,
  cta = 'Continue attendance',
}: {
  title: string;
  sessionId: string;
  grant: TutorRecoveryGrantNotice;
  href?: string;
  cta?: string;
}) {
  const [now, setNow] = React.useState(() => grant.observedAt ? Date.parse(grant.observedAt) : Date.now());

  React.useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!isRecoveryWindowActive(grant, now)) return null;

  return (
    <section role="status" className="space-y-3 rounded-xl border border-status-warning/40 bg-status-warning/5 p-4 sm:p-5" aria-label={`Attendance reopened by Admin for ${title}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary">Attendance reopened by Admin</p>
          <h2 className="mt-1 break-words text-base font-semibold text-text-primary">{title}</h2>
        </div>
        <div className="shrink-0 rounded-lg border border-status-warning/40 bg-canvas px-3 py-2 text-center">
          <p className="font-mono text-lg font-bold tabular-nums text-text-primary" aria-live="polite">{formatRecoveryTimeRemaining(grant.closesAt, now)}</p>
          <p className="inline-flex items-center gap-1 text-xs text-text-muted"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Closes at {formatDateTime(grant.closesAt, { includeYear: true })}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1 text-sm text-text-muted">
          <p>Admin: <span className="font-medium text-text-primary">{grant.adminName ?? 'Admin'}</span></p>
          {grant.adminReason && <p className="break-words">Admin recovery note: <span className="text-text-primary">{grant.adminReason}</span></p>}
        </div>
        <Link href={href ?? `/tutor/attendance/${encodeURIComponent(sessionId)}`} className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover sm:w-fit">
          {cta}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
