import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';

type Payable = NonNullable<Awaited<ReturnType<typeof import('@/features/finances/server/finance-actions').getAdminPayableDetail>>>;

export function PayableDetail({ detail }: { detail: Payable }) {
  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 space-y-6">
      <header className="space-y-3 border-b border-border-subtle pb-5">
        <Link href="/admin/finances" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Finances</Link>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{detail.type === 'tutor' ? 'Tutor payable' : `${detail.sourceKind} commission`}</Badge>{!detail.active && <Badge variant="outline">Inactive source</Badge>}<span className="text-xs font-semibold text-text-muted">Lifetime · read-only provenance</span></div>
        <h1 className="break-words text-2xl font-bold text-text-primary sm:text-3xl">{detail.name}</h1>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Lifetime payable totals">
        <AmountCard label="Earned" value={detail.earned} />
        <AmountCard label="Paid" value={detail.paid} />
        <AmountCard label="Outstanding" value={detail.outstanding} />
      </section>

      <Card className="border-border-subtle bg-canvas shadow-xs"><CardHeader><CardTitle className="text-base">{detail.type === 'tutor' ? 'Compensation snapshots' : 'Commission provenance'}</CardTitle></CardHeader><CardContent className="space-y-3">
        {detail.earnings.length ? detail.earnings.map((entry) => (
          <article key={entry.id} className="flex min-w-0 flex-col gap-2 border-b border-border-subtle pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><Link href={`/admin/finances/sessions/${encodeURIComponent(entry.sessionId)}`} className="inline-flex min-h-[44px] items-center break-words font-semibold text-brand-primary underline-offset-2 hover:underline">{entry.title}</Link><p className="text-xs text-text-muted">Session {formatDateTime(entry.startTime, { includeYear: true })} · snapshot recorded {formatDateTime(entry.createdAt, { includeYear: true })}</p>
              {'deliveredMinutes' in entry ? <p className="text-sm text-text-primary">{(entry.deliveredMinutes / 60).toFixed(2)} h × {formatEGP(entry.rate)} / h · snapshotted compensation</p> : <><p className="text-sm text-text-primary">{entry.studentName} · {entry.rateBps / 100}% of {formatEGP(entry.basisAmount)} · {entry.basis}</p><p className="break-all text-xs text-text-muted">Wallet event {entry.walletTransactionId} · rule v{entry.ruleVersion} · source snapshot {entry.sourceSnapshot}</p><Link href={`/admin/accounts/${encodeURIComponent(entry.studentId)}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-primary">View attributed Student</Link></>}
            </div><p className="shrink-0 font-bold tabular-nums text-text-primary">{formatEGP(entry.amount)}</p>
          </article>
        )) : <p className="text-sm text-text-muted">No earnings are recorded for this recipient.</p>}
        {detail.earningCount > detail.earnings.length && <p className="text-xs text-text-muted">Showing the latest {detail.earnings.length} of {detail.earningCount} earning records.</p>}
      </CardContent></Card>

      <Card className="border-border-subtle bg-canvas shadow-xs"><CardHeader><CardTitle className="text-base">Recorded payouts</CardTitle></CardHeader><CardContent className="space-y-3">
        {detail.payouts.length ? detail.payouts.map((entry) => <article key={entry.id} className="flex min-w-0 flex-col gap-2 border-b border-border-subtle pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-text-primary">{entry.reversal ? 'Reversal' : entry.reversed ? 'Reversed payout' : 'Payout'} · {formatDateTime(entry.paidAt, { includeYear: true })}</p><p className="break-words text-xs text-text-muted">{[entry.reference, entry.note, entry.createdBy ? `Recorded by ${entry.createdBy}` : null].filter(Boolean).join(' · ') || 'No note or reference'}</p></div><p className="font-bold tabular-nums text-text-primary">{formatEGP(entry.reversal ? `-${entry.amount}` : entry.amount)}</p></article>) : <p className="text-sm text-text-muted">No payouts have been recorded.</p>}
        {detail.payoutCount > detail.payouts.length && <p className="text-xs text-text-muted">Showing the latest {detail.payouts.length} of {detail.payoutCount} payout records.</p>}
      </CardContent></Card>
      {detail.type === 'source' && <p className="text-xs leading-relaxed text-text-muted">Commission basis is finalized internal student wallet charges. It does not establish external cash collection.</p>}
    </main>
  );
}

function AmountCard({ label, value }: { label: string; value: string }) {
  return <Card className="border-border-subtle bg-canvas shadow-xs"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p><p className="mt-2 text-xl font-bold tabular-nums text-text-primary">{formatEGP(value)}</p></CardContent></Card>;
}
