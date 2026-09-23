import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';

type SessionDetail = NonNullable<Awaited<ReturnType<typeof import('@/features/finances/server/finance-actions').getAdminFinanceSessionDetail>>>;

export function FinanceSessionDetail({ detail }: { detail: SessionDetail }) {
  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 space-y-6">
      <header className="space-y-3 border-b border-border-subtle pb-5">
        <Link href="/admin/finances" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Finances</Link>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{detail.status}</Badge>{detail.historicalOnly && <Badge variant="outline">Historical only</Badge>}<span className="text-xs font-semibold text-text-muted">Read-only financial record</span></div>
        <h1 className="break-words text-2xl font-bold text-text-primary sm:text-3xl">{detail.title}</h1>
        <p className="text-sm text-text-muted">{detail.sessionType} · {formatDateTime(detail.startTime, { includeYear: true })} – {formatDateTime(detail.endTime, { includeYear: true })}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Session finance snapshots">
        <Card className="border-border-subtle bg-canvas"><CardHeader><CardTitle className="text-base">Student price snapshot</CardTitle></CardHeader><CardContent className="space-y-1"><p className="text-xl font-bold text-text-primary">{detail.priceSnapshot ? formatEGP(detail.priceSnapshot) : detail.historicalOnly ? 'Historical only' : detail.finalizedAt || detail.status === 'COMPLETED' ? 'Snapshot unavailable' : 'Pending settlement'}</p><p className="text-sm text-text-muted">{detail.priceSnapshot ? detail.pricingProfileNameSnapshot ?? 'Platform fallback' : 'No price was stored for this Session.'}</p></CardContent></Card>
        <Card className="border-border-subtle bg-canvas"><CardHeader><CardTitle className="text-base">Tutor compensation snapshot</CardTitle></CardHeader><CardContent className="space-y-1"><p className="text-xl font-bold text-text-primary">{detail.compensation ? formatEGP(detail.compensation.amount) : 'No accrual'}</p><p className="text-sm text-text-muted">{detail.compensation ? `${detail.compensation.deliveredMinutes} minutes × ${formatEGP(detail.compensation.hourlyRate)} / hour` : 'No Tutor-pay ledger entry is recorded.'}</p>{detail.compensation && <p className="text-xs text-text-muted">Accrued {formatDateTime(detail.compensation.createdAt, { includeYear: true })}</p>}</CardContent></Card>
      </section>

      <Card className="border-border-subtle bg-canvas"><CardHeader><CardTitle className="text-base">Roster and delivery</CardTitle></CardHeader><CardContent className="space-y-3"><p className="flex flex-wrap items-center gap-1 text-sm text-text-muted"><span>Tutor:</span><Link className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary underline-offset-2 hover:underline" href={`/admin/accounts/${encodeURIComponent(detail.tutor.id)}`}>{detail.tutor.name}</Link></p>{detail.students.map((student) => <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3"><Link href={`/admin/accounts/${encodeURIComponent(student.id)}`} className="min-h-[44px] inline-flex items-center font-medium text-brand-primary underline-offset-2 hover:underline">{student.name}</Link><Badge variant="outline">{detail.attendanceSavedAt ? (student.attended ? 'Present' : 'Absent') : 'Not recorded'}</Badge></div>)}</CardContent></Card>

      <section className="space-y-3" aria-label="Wallet and commission provenance"><h2 className="text-lg font-semibold text-text-primary">Wallet charge provenance</h2>{detail.charges.length ? detail.charges.map((charge) => <Card key={charge.id} className="border-border-subtle bg-canvas"><CardContent className="space-y-2 p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/admin/accounts/${encodeURIComponent(charge.studentId)}`} className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary underline-offset-2 hover:underline">{charge.studentName}</Link><p className="break-all text-xs text-text-muted">Wallet event {charge.id} · {formatDateTime(charge.createdAt, { includeYear: true })}</p></div><p className="font-bold tabular-nums text-text-primary">{formatEGP(charge.amount)}</p></div>{charge.commission ? <div className="rounded-lg bg-canvas-subtle p-3 text-sm"><p className="font-semibold text-text-primary">Commission: {formatEGP(charge.commission.amount)} · {charge.commission.rateBps / 100}% · rule v{charge.commission.ruleVersion}</p><p className="text-text-muted">{formatEGP(charge.commission.basisAmount)} basis · {charge.commission.basis} · source snapshot {charge.commission.sourceName}</p><Link href={`/admin/accounts?referralSourceId=${encodeURIComponent(charge.commission.sourceId)}`} className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary underline-offset-2 hover:underline">View source accounts</Link></div> : <p className="text-sm text-text-muted">No commission was accrued from this charge.</p>}</CardContent></Card>) : <Card className="border-border-subtle bg-canvas"><CardContent className="p-5 text-sm text-text-muted">No system-tracked wallet charges are linked to this Session.</CardContent></Card>}</section>
    </main>
  );
}
