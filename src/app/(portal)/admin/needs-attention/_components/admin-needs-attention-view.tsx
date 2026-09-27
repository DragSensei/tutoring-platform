'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent } from '@/shared/components/card';
import { formatDateTime } from '@/shared/utils/date-format';
import { formatRecoveryTimeRemaining } from '@/features/attendance/utils/recovery-time';
import type { AdminAttendanceInterventionBoard, AdminAttendanceHandledItem, AdminAttendanceAttentionItem } from '@/features/attendance/server/admin-attendance';
import { AdminAttendanceHandledForm } from './admin-attendance-handled-form';

type Category = 'needs-action' | 'recovery-active' | 'handled';

const warningLabels = {
  ATTENDANCE_MISSING: 'Missing attendance',
  ATTENDANCE_NEEDS_REVIEW: 'Legacy data · Admin review',
  RECOVERY_ACTIVE: 'Recovery window active',
  RECOVERY_EXPIRED: 'Recovery window expired',
  TUTOR_RATE_MISSING: 'Tutor rate missing',
  SETTLEMENT_PENDING: 'Finalization pending',
  LINKED_STUDENTS_DIFFERENT_ENROLLMENT: 'Linked enrollment needs review',
  LINKED_STUDENTS_DIFFERENT_GROUPS: 'Linked Group needs review',
} as const;

export function AdminNeedsAttentionView({ board, asOf }: { board: AdminAttendanceInterventionBoard; asOf: string }) {
  const [category, setCategory] = React.useState<Category>('needs-action');
  const [now, setNow] = React.useState(() => Date.parse(asOf));

  React.useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const recoveryActive = board.recoveryActive.filter((item) => item.closesAt && Date.parse(item.closesAt) >= now);
  const newlyExpired = board.recoveryActive
    .filter((item) => !item.closesAt || Date.parse(item.closesAt) < now)
    .map((item) => ({ ...item, recoveryWindowActive: false }));
  const handled = [...board.handled, ...newlyExpired]
    .sort((left, right) => Date.parse(right.openedAt) - Date.parse(left.openedAt));
  const tabs: Array<{ id: Category; label: string; count: number }> = [
    { id: 'needs-action', label: 'Needs Action', count: board.needsAction.length },
    { id: 'recovery-active', label: 'Recovery Active', count: recoveryActive.length },
    { id: 'handled', label: 'Handled — Last 30 Days', count: handled.length },
  ];

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-3 border-b border-border-subtle pb-5">
        <Link href="/admin" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Overview</Link>
        <p className="text-sm font-semibold text-brand-primary">Admin · attendance operations</p>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Needs Attention</h1>
        <p className="text-sm text-text-muted">Review Tutor actions, active recovery windows, and recent Admin interventions.</p>
      </header>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-border-subtle bg-canvas-subtle p-1 sm:grid-cols-3" role="tablist" aria-label="Attendance attention categories">
        {tabs.map((tab) => <button key={tab.id} id={`${tab.id}-tab`} type="button" role="tab" aria-selected={category === tab.id} aria-controls={`${tab.id}-panel`} onClick={() => setCategory(tab.id)} className={`flex min-h-[48px] items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-semibold ${category === tab.id ? 'bg-canvas text-brand-primary shadow-xs' : 'text-text-muted hover:text-text-primary'}`}>
          <span>{tab.label}</span><span className="font-mono tabular-nums">{tab.count}</span>
        </button>)}
      </div>

      {category === 'needs-action' && <div id="needs-action-panel" role="tabpanel" aria-labelledby="needs-action-tab"><Card className="border-border-subtle bg-canvas"><CardContent className="pt-6">
        {board.needsAction.length ? <ol className="divide-y divide-border-subtle">{board.needsAction.map((item) => <NeedsActionRow key={item.id} item={item} />)}</ol> : <EmptyState icon="action" message="No Sessions currently need an Admin or Tutor follow-up." />}
      </CardContent></Card></div>}

      {category === 'recovery-active' && <div id="recovery-active-panel" role="tabpanel" aria-labelledby="recovery-active-tab"><Card className="border-status-warning/40 bg-canvas"><CardContent className="pt-6">
        {recoveryActive.length ? <ol className="divide-y divide-border-subtle">{recoveryActive.map((item) => <ActiveRecoveryRow key={item.id} item={item} now={now} />)}</ol> : <EmptyState icon="action" message="No Admin recovery windows are active." />}
      </CardContent></Card></div>}

      {category === 'handled' && <div id="handled-panel" role="tabpanel" aria-labelledby="handled-tab"><Card className="border-border-subtle bg-canvas"><CardContent className="pt-6">
        {handled.length ? <ol className="divide-y divide-border-subtle">{handled.map((item) => <HandledRow key={item.id} item={item} now={now} />)}</ol> : <EmptyState icon="handled" message="No Admin attendance interventions were recorded in the last 30 days." />}
      </CardContent></Card></div>}

      <p className="text-xs text-text-muted">As of {formatDateTime(asOf, { includeYear: true })}. Each Session can receive only one Admin attendance intervention.</p>
    </div>
  );
}

function NeedsActionRow({ item }: { item: AdminAttendanceAttentionItem }) {
  const href = item.reviewHref ?? `/admin/finances/sessions/${encodeURIComponent(item.id)}`;
  const canMarkHandled = item.kind !== 'LINKED_STUDENTS'
    && item.warnings.some((warning) => warning === 'ATTENDANCE_MISSING' || warning === 'ATTENDANCE_NEEDS_REVIEW');
  return <li className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2">{item.warnings.map((warning) => <Badge key={warning} variant="warning">{warningLabels[warning]}</Badge>)}</div>
      <h2 className="mt-2 break-words font-semibold text-text-primary">{item.title}</h2>
      {item.kind === 'LINKED_STUDENTS' && item.linkedStudents?.map((student) => <p key={student.id} className="mt-1 text-sm text-text-muted">{student.name} · {student.enrollment}</p>)}
      {item.kind !== 'LINKED_STUDENTS' && <p className="mt-1 text-sm text-text-muted">Tutor: {item.tutorName} · {formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}</p>}
      {item.deadline && <p className="mt-1 text-xs text-text-muted">Normal attendance deadline: {formatDateTime(item.deadline, { includeYear: true })}</p>}
      {item.reviewDetail && <p className="mt-2 text-sm font-medium text-status-warning">{item.reviewDetail}</p>}
    </div>
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:shrink-0">
      <Link href={href} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Review {item.kind === 'LINKED_STUDENTS' ? 'Students' : 'Session'}</Link>
      {canMarkHandled && <AdminAttendanceHandledForm sessionId={item.id} />}
    </div>
  </li>;
}

function ActiveRecoveryRow({ item, now }: { item: AdminAttendanceHandledItem; now: number }) {
  return <li className="flex min-w-0 flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 space-y-1">
      <Badge variant="warning">Recovery window active</Badge>
      <h2 className="break-words text-lg font-semibold text-text-primary">{item.title}</h2>
      <p className="text-sm text-text-muted">Tutor: {item.tutorName} · {formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}</p>
      {item.closesAt && <div className="my-2 inline-flex flex-col rounded-lg border border-status-warning/40 bg-status-warning/5 px-3 py-2">
        <p className="font-mono text-xl font-bold tabular-nums text-text-primary">{formatRecoveryTimeRemaining(item.closesAt, now)}</p>
        <p className="inline-flex items-center gap-1 text-sm text-text-muted"><Clock3 className="h-4 w-4" aria-hidden="true" />Closes at {formatDateTime(item.closesAt, { includeYear: true })}</p>
      </div>}
      <p className="text-sm text-text-muted">Granted by <span className="font-medium text-text-primary">{item.adminName}</span> · {formatDateTime(item.openedAt, { includeYear: true })}</p>
      {item.adminReason && <p className="break-words text-sm text-text-primary">Admin recovery note: {item.adminReason}</p>}
      <p className="text-xs text-text-muted">This is the remaining window from the stored Admin deadline. The Session cannot receive another recovery grant.</p>
    </div>
    <Link href={`/admin/finances/sessions/${encodeURIComponent(item.id)}`} className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle sm:w-auto">View Session</Link>
  </li>;
}

function HandledRow({ item, now }: { item: AdminAttendanceHandledItem; now: number }) {
  const recoveryExpired = item.closesAt !== null && Date.parse(item.closesAt) < now && !item.usedAt;
  const state = item.interventionKind === 'ADMIN_RESOLVED' ? 'Handled by Admin'
    : item.usedAt ? 'Recovery used'
      : recoveryExpired ? 'Recovery window expired' : 'Recovery granted';
  return <li className="flex min-w-0 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="success">{state}</Badge><h2 className="break-words font-semibold text-text-primary">{item.title}</h2></div>
      <p className="text-sm text-text-muted">Tutor: {item.tutorName} · {formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}</p>
      <p className="text-sm text-text-muted"><Clock3 className="mr-1 inline h-4 w-4" aria-hidden="true" />{item.interventionKind === 'ADMIN_RESOLVED' ? 'Handled by' : 'Granted by'} {item.adminName} · {formatDateTime(item.openedAt, { includeYear: true })}{item.closesAt ? ` · Closed ${formatDateTime(item.closesAt, { includeYear: true })}` : ''}</p>
      <p className="break-words text-sm text-text-primary">{item.interventionKind === 'RECOVERY_GRANTED' ? 'Admin recovery note' : 'Admin handling note'}: {item.adminReason}</p>
      {item.interventionKind === 'ADMIN_RESOLVED' && <p className="text-xs text-text-muted">No recovery window was opened for this resolved Session.</p>}
      {item.usedAt && <p className="text-sm text-text-muted">Attendance submitted {formatDateTime(item.usedAt, { includeYear: true })}{item.tutorExplanation ? ` · Attendance delay reason: ${item.tutorExplanation}` : ''}</p>}
    </div>
    <Link href={`/admin/finances/sessions/${encodeURIComponent(item.id)}`} className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle sm:w-auto">View Session</Link>
  </li>;
}

function EmptyState({ icon, message }: { icon: 'action' | 'handled'; message: string }) {
  const Icon = icon === 'handled' ? CheckCircle2 : AlertTriangle;
  return <p className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-text-muted"><Icon className="mr-2 inline h-4 w-4" aria-hidden="true" />{message}</p>;
}
