import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatDateTime } from '@/shared/utils/date-format';
import type { AdminAttendanceInterventionBoard } from '@/features/attendance/server/admin-attendance';
import { AdminAttendanceHandledForm } from './admin-attendance-handled-form';

const warningLabels = {
  ATTENDANCE_MISSING: 'Missing attendance',
  ATTENDANCE_NEEDS_REVIEW: 'Roster needs review',
  RECOVERY_ACTIVE: 'Recovery Window Active',
  RECOVERY_EXPIRED: 'Recovery window expired',
  TUTOR_RATE_MISSING: 'Tutor rate missing',
  SETTLEMENT_PENDING: 'Finalization pending',
  LINKED_STUDENTS_DIFFERENT_ENROLLMENT: 'Linked enrollment needs review',
  LINKED_STUDENTS_DIFFERENT_GROUPS: 'Linked Group needs review',
} as const;

export function AdminNeedsAttentionView({ board, asOf }: { board: AdminAttendanceInterventionBoard; asOf: string }) {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-3 border-b border-border-subtle pb-5">
        <Link href="/admin" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Overview</Link>
        <p className="text-sm font-semibold text-brand-primary">Admin · attendance operations</p>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Needs Attention</h1>
        <p className="text-sm text-text-muted">Review unresolved Session attendance and check recent Admin interventions.</p>
      </header>

      <Card className="border-border-subtle bg-canvas" aria-labelledby="needs-action-heading">
        <CardHeader><CardTitle id="needs-action-heading" className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-status-warning" aria-hidden="true" />Needs Action <span className="font-mono tabular-nums">({board.needsAction.length})</span></CardTitle></CardHeader>
        <CardContent>
          {board.needsAction.length ? <ol className="divide-y divide-border-subtle">{board.needsAction.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">{item.warnings.map((warning) => <Badge key={warning} variant="warning">{warningLabels[warning]}</Badge>)}</div>
                <h2 className="mt-2 break-words font-semibold text-text-primary">{item.title}</h2>
                <p className="mt-1 text-sm text-text-muted">Tutor: {item.tutorName} · {formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}</p>
                {item.deadline && <p className="mt-1 text-xs text-text-muted">Normal attendance deadline: {formatDateTime(item.deadline, { includeYear: true })}</p>}
                {item.reviewDetail && <p className="mt-1 text-sm font-medium text-status-warning">{item.reviewDetail}</p>}
              </div>
              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:shrink-0">
                <Link href={`/admin/finances/sessions/${encodeURIComponent(item.id)}`} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Review Session</Link>
                <AdminAttendanceHandledForm sessionId={item.id} />
              </div>
            </li>
          ))}</ol> : <p className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-muted">No Sessions currently need an Admin attendance intervention.</p>}
        </CardContent>
      </Card>

      <Card className="border-border-subtle bg-canvas" aria-labelledby="handled-heading">
        <CardHeader><CardTitle id="handled-heading" className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-brand-primary" aria-hidden="true" />Handled — Last 30 Days <span className="font-mono tabular-nums">({board.handled.length})</span></CardTitle></CardHeader>
        <CardContent>
          {board.handled.length ? <ol className="divide-y divide-border-subtle">{board.handled.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><Badge variant={item.recoveryWindowActive ? 'warning' : 'success'}>{item.interventionKind === 'ADMIN_RESOLVED' ? 'Handled by Admin' : item.recoveryWindowActive ? 'Recovery Window Active' : item.usedAt ? 'Recovery used' : 'Recovery window expired'}</Badge><h2 className="break-words font-semibold text-text-primary">{item.title}</h2></div>
                <p className="text-sm text-text-muted">Tutor: {item.tutorName} · {formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}</p>
                <p className="text-sm text-text-muted"><Clock3 className="mr-1 inline h-4 w-4" aria-hidden="true" />{item.interventionKind === 'ADMIN_RESOLVED' ? 'Handled by' : 'Granted by'} {item.adminName} · {formatDateTime(item.openedAt, { includeYear: true })}{item.closesAt ? ` → ${formatDateTime(item.closesAt, { includeYear: true })}` : ''}</p>
                <p className="break-words text-sm text-text-muted">Admin note: {item.adminReason}</p>
                {item.interventionKind === 'ADMIN_RESOLVED' && <p className="text-xs text-text-muted">No recovery window was opened for this resolved Session.</p>}
                {item.usedAt && <p className="text-xs text-text-muted">Attendance submitted {formatDateTime(item.usedAt, { includeYear: true })}{item.tutorExplanation ? ` · Tutor note: ${item.tutorExplanation}` : ''}</p>}
                {item.recoveryWindowActive && <p className="text-xs font-medium text-text-primary">This Session is handled and cannot receive another recovery grant.</p>}
              </div>
              <Link href={`/admin/finances/sessions/${encodeURIComponent(item.id)}`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">View Session</Link>
            </li>
          ))}</ol> : <p className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-muted">No Admin attendance interventions were recorded in the last 30 days.</p>}
        </CardContent>
      </Card>
      <p className="text-xs text-text-muted">As of {formatDateTime(asOf, { includeYear: true })}. Each Session can receive only one Admin attendance intervention.</p>
    </div>
  );
}
