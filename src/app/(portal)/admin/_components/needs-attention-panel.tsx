import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatDateTime } from '@/shared/utils/date-format';
import type { AdminAttendanceAttentionItem, AdminAttendanceWarning } from '@/features/attendance/server/admin-attendance';

const warningLabels: Record<AdminAttendanceWarning, string> = {
  ATTENDANCE_MISSING: 'Missing attendance',
  ATTENDANCE_NEEDS_REVIEW: 'Roster needs review',
  RECOVERY_ACTIVE: 'Recovery window active',
  RECOVERY_EXPIRED: 'Recovery window expired',
  TUTOR_RATE_MISSING: 'Tutor rate missing',
  SETTLEMENT_PENDING: 'Finalization pending',
  LINKED_STUDENTS_DIFFERENT_ENROLLMENT: 'Linked students are on different enrollment types',
  LINKED_STUDENTS_DIFFERENT_GROUPS: 'Linked students are assigned to different Groups',
};

export function NeedsAttentionPanel({ items }: { items: AdminAttendanceAttentionItem[] }) {
  return (
    <Card className="border-status-warning/40 bg-status-warning/5" aria-labelledby="needs-attention-heading">
      <CardHeader><CardTitle id="needs-attention-heading" className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-status-warning" aria-hidden="true" />Needs attention</CardTitle></CardHeader>
      <CardContent>
        {items.length ? <ol className="divide-y divide-border-subtle">{items.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">{item.warnings.map((warning) => <span key={warning} className="rounded-md border border-status-warning/40 bg-canvas px-2 py-1 text-xs font-semibold text-text-primary">{warningLabels[warning]}</span>)}</div>
              <p className="mt-2 break-words font-semibold text-text-primary">{item.title}{item.tutorName ? ` · ${item.tutorName}` : ''}</p>
              {item.kind !== 'LINKED_STUDENTS' && <p className="mt-1 text-sm text-text-muted">{formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}</p>}
              {item.linkedStudents?.map((student) => <p key={student.id} className="mt-1 text-sm text-text-muted"><Link className="font-semibold text-text-primary underline-offset-2 hover:underline" href={`/admin/accounts/${student.id}`}>{student.name}</Link><span> · {student.enrollment}</span></p>)}
              {item.deadline && <p className="mt-1 text-xs text-text-muted">Attendance deadline passed {formatDateTime(item.deadline, { includeYear: true })}. No Tutor payable has been created.</p>}
              {item.reviewDetail && <p className="mt-1 text-xs font-medium text-status-warning">{item.reviewDetail}</p>}
              {item.grantClosesAt && item.warnings.includes('RECOVERY_ACTIVE') && <p className="mt-1 text-xs text-text-muted">Recovery closes {formatDateTime(item.grantClosesAt, { includeYear: true })}.</p>}
              {item.adminReason && item.warnings.includes('RECOVERY_EXPIRED') && <p className="mt-1 text-xs text-text-muted">Previous Admin note: {item.adminReason}</p>}
            </div>
            <Link href={item.reviewHref ?? `/admin/finances/sessions/${encodeURIComponent(item.id)}`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-canvas px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Review</Link>
          </li>
        ))}</ol> : <p className="rounded-lg border border-dashed border-border-subtle bg-canvas p-5 text-center text-sm text-text-muted">No unresolved attendance or Tutor-pay items.</p>}
      </CardContent>
    </Card>
  );
}
