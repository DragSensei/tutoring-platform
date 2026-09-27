'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/button';
import { formatDateTime } from '@/shared/utils/date-format';
import { grantAdminAttendanceRecovery } from '../actions';

export interface AttendanceRecoveryAuditItem {
  id: string;
  adminName: string;
  adminReason: string;
  durationHours: number;
  openedAt: string;
  closesAt: string;
  isActive: boolean;
  tutorExplanation: string | null;
  tutorAttestedAt: string | null;
  screenshotUnavailable: boolean | null;
  usedAt: string | null;
}

export function AttendanceRecoveryReview({
  sessionId,
  eligible,
  attendanceDeadline,
  submittedAt,
  adminHandling,
  grants,
}: {
  sessionId: string;
  eligible: boolean;
  attendanceDeadline: string;
  submittedAt: string | null;
  adminHandling: { handledAt: string; adminName: string; note: string } | null;
  grants: AttendanceRecoveryAuditItem[];
}) {
  const router = useRouter();
  const [reason, setReason] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function grant() {
    if (reason.trim().length < 8) {
      setMessage('Add a note explaining why attendance could not be submitted.');
      return;
    }
    startTransition(async () => {
      const result = await grantAdminAttendanceRecovery(sessionId, reason);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setReason('');
      setMessage(`Recovery granted for ${result.durationHours} hour${result.durationHours === 1 ? '' : 's'}, until ${formatDateTime(result.closesAt, { includeYear: true })}.`);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border-subtle bg-canvas p-5" aria-labelledby="attendance-recovery-heading">
      <div>
        <h2 id="attendance-recovery-heading" className="text-lg font-semibold text-text-primary">Attendance recovery</h2>
        <p className="mt-1 text-sm text-text-muted">Normal attendance deadline: {formatDateTime(attendanceDeadline, { includeYear: true })}. An Admin grant opens a separate window with its own saved deadline.</p>
      </div>
      {submittedAt ? <p className="text-sm font-medium text-text-primary">Attendance submitted {formatDateTime(submittedAt, { includeYear: true })}{grants.some((grantItem) => grantItem.usedAt) ? ' · Late attendance, Admin-authorized' : ''}</p> : <p className="text-sm text-text-muted">No final attendance submission is recorded. A draft save does not settle Student wallets or create Tutor pay.</p>}
      {adminHandling && grants.length === 0 && <div role="status" className="space-y-1 rounded-lg border border-brand-border bg-brand-subtle px-3 py-2 text-sm text-text-primary"><p className="font-semibold">Handled by {adminHandling.adminName} · {formatDateTime(adminHandling.handledAt, { includeYear: true })}</p><p>{adminHandling.note}</p><p>This Session cannot receive a recovery window because its Admin intervention is complete.</p></div>}
      {eligible && !submittedAt && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-white p-4">
          <label htmlFor="recovery-admin-reason" className="block text-sm font-semibold text-text-primary">Why could the Tutor not submit attendance?</label>
          <textarea id="recovery-admin-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
          <Button type="button" className="min-h-[44px]" disabled={isPending} isLoading={isPending} onClick={grant}>Grant late attendance window</Button>
        </div>
      )}
      {!eligible && !submittedAt && grants.length > 0 && <p role="status" className="rounded-lg border border-brand-border bg-brand-subtle px-3 py-2 text-sm font-medium text-text-primary">Admin already handled this Session. Another recovery window cannot be granted.</p>}
      {message && <p role="status" className="text-sm text-text-primary">{message}</p>}
      {grants.length > 0 && <ol className="divide-y divide-border-subtle">{grants.map((grantItem) => (
        <li key={grantItem.id} className="space-y-2 py-3 first:pt-0 last:pb-0 text-sm">
          <p className="font-semibold text-text-primary">{grantItem.usedAt ? 'Recovery used' : grantItem.isActive ? 'Recovery Window Active' : 'Recovery window expired'} · {grantItem.durationHours} hour{grantItem.durationHours === 1 ? '' : 's'}</p>
          <p className="text-text-muted">Granted by {grantItem.adminName} · {formatDateTime(grantItem.openedAt, { includeYear: true })} → {formatDateTime(grantItem.closesAt, { includeYear: true })}</p>
          <p className="text-text-muted">Admin note: {grantItem.adminReason}</p>
          {grantItem.tutorExplanation && <p className="text-text-muted">Tutor explanation: {grantItem.tutorExplanation}</p>}
          {grantItem.tutorAttestedAt && <p className="text-text-muted">Tutor attested accuracy {formatDateTime(grantItem.tutorAttestedAt, { includeYear: true })}.</p>}
          {grantItem.usedAt && <p className="text-text-muted">Late attendance submitted {formatDateTime(grantItem.usedAt, { includeYear: true })} · {grantItem.screenshotUnavailable ? 'Screenshot unavailable; requirement waived.' : 'Screenshot was optional during recovery.'}</p>}
        </li>
      ))}</ol>}
    </section>
  );
}
