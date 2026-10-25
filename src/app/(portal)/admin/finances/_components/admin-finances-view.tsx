import Link from 'next/link';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import { FinanceDateRangeForm } from './finance-date-range-form';
import { FinanceNavigation } from './finance-navigation';
import { PayoutForm } from './payout-form';
import { randomUUID } from 'node:crypto';
import { describeWalletDeduction } from '@/features/finances/domain/wallet-deduction-copy';

type FinanceReport = Awaited<ReturnType<typeof import('@/features/finances/server/finance-actions').getAdminFinanceReport>>;

function hours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}

function walletDeductionDetail(entry: FinanceReport['charges'][number]) {
  const copy = describeWalletDeduction({
    finalizedAt: entry.finalizedAt,
    formattedPriceSnapshot: entry.priceSnapshot ? formatEGP(entry.priceSnapshot) : null,
    pricingProfileNameSnapshot: entry.pricingProfileNameSnapshot,
  });
  return `${copy.chargeStatus} · ${copy.pricingSnapshot}`;
}

export function AdminFinancesView({ report }: { report: FinanceReport }) {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex min-h-[92px] flex-col justify-center space-y-2 border-b border-border-subtle pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Tutor finances</h1>
        <p className="text-sm text-text-muted">Finalized attended hours × the hourly rate saved for each session. Existing earnings keep their saved rates.</p>
      </header>

      <FinanceNavigation active="Overview" />

      <form action="/admin/finances" method="get" className="flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-end">
        <label className="flex min-h-[44px] flex-1 flex-col gap-1 text-xs font-semibold text-text-primary">22-to-22 finance cycle
          <input name="cycle" type="month" defaultValue={report.range.cycleMonth} className="min-h-[44px] rounded-lg border border-border-strong bg-canvas px-3 text-sm text-text-primary" />
        </label>
        <button type="submit" className="min-h-[44px] rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-brand-subtle hover:bg-brand-hover">Show cycle</button>
        <p className="text-xs text-text-muted sm:max-w-xs">Cycle starts on the 22nd at 00:00 Cairo time and ends at the next 22nd, exclusive.</p>
      </form>

      <section aria-label="Tutor lifetime balances" className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Tutors</h2>
          <p className="text-sm text-text-muted">Lifetime totals. Open a tutor to see the saved rate on every compensation entry.</p>
        </div>
        {report.tutorPayables.length ? (
          <div className="divide-y divide-border-subtle border-y border-border-subtle">
            {report.tutorPayables.map((row) => (
              <article key={row.id} className="grid min-w-0 gap-2 py-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] sm:items-center">
                <div><Link href={`/admin/finances/payables/tutor/${encodeURIComponent(row.id)}`} className="inline-flex min-h-[44px] items-center break-words font-semibold text-brand-primary">{row.name}</Link><p className="text-xs text-text-muted">{row.sessionCount} compensated sessions</p></div>
                <Metric label="Attended hours" value={hours(row.deliveredMinutes)} />
                <Metric label="Earned" value={formatEGP(row.earned)} />
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <Metric label="Paid" value={formatEGP(row.paid)} />
                  <Metric label="Outstanding" value={formatEGP(row.outstanding)} />
                </div>
              </article>
            ))}
          </div>
        ) : <p className="py-4 text-sm text-text-muted">No finalized tutor hours have accrued.</p>}
      </section>

      <section aria-label="Selected activity totals" className="border-y border-border-subtle py-4">
        <h2 className="font-semibold text-text-primary">Selected activity period · {report.range.from} to {report.range.to}</h2>
        <p className="mt-2 text-sm text-text-muted">{hours(report.summary.compensatedMinutes)} compensated hours · {formatEGP(report.summary.tutorCompensation)} earned</p>
        <p className="mt-1 text-xs text-text-muted">The totals cover activity in the selected date range. Per-session saved rates are listed below.</p>
      </section>

      <section aria-label="Compensation entries" className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Compensation entries</h2>
          <p className="text-sm text-text-muted">Each amount is calculated from the attended duration and that session’s saved hourly rate.</p>
        </div>
        {report.compensation.length ? <div className="divide-y divide-border-subtle border-y border-border-subtle">
          {report.compensation.map((entry) => <article key={entry.id} className="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="break-words font-semibold text-text-primary">{entry.tutorName}</p>
              <p className="text-sm text-text-muted">{hours(entry.deliveredMinutes)} × {formatEGP(entry.hourlyRate)} / hour</p>
              <p className="text-xs text-text-muted">Recorded {formatDateTime(entry.createdAt, { includeYear: true })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold tabular-nums text-text-primary">{formatEGP(entry.amount)}</span>
              <Link href={`/admin/finances/sessions/${encodeURIComponent(entry.sessionId)}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-primary">Session details</Link>
            </div>
          </article>)}
        </div> : <p className="py-4 text-sm text-text-muted">No compensation entries in this date range.</p>}
        {report.displayedRows.compensation > report.compensation.length && <p className="text-xs text-text-muted">Showing latest {report.compensation.length} of {report.displayedRows.compensation} entries.</p>}
      </section>

      <details className="border-t border-border-subtle pt-4">
        <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-text-primary">Other financial records and payout tools</summary>
        <div className="space-y-6 py-3">
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary" href="/admin/finances/tutors">Tutor payables</Link>
            <Link className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary" href="/admin/finances/sales">Sales & referrals</Link>
            <Link className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary" href="/admin/finances/receivables">Student receivables</Link>
          </div>
          <PayoutForm initialKey={randomUUID()} options={[
            ...report.tutorPayables.filter(({ outstanding }) => Number(outstanding) > 0).map((row) => ({ value: `tutor:${row.id}`, label: `${row.name} · Tutor · ${formatEGP(row.outstanding)} outstanding` })),
            ...report.salesPayables.filter(({ outstanding }) => Number(outstanding) > 0).map((row) => ({ value: `source:${row.id}`, label: `${row.name} · ${row.kind === 'SALES' ? 'Sales' : 'Referral'} · ${formatEGP(row.outstanding)} outstanding` })),
          ]} />
          <div className="space-y-2">
            <h3 className="font-semibold text-text-primary">Payout history · lifetime</h3>
            {report.payouts.length ? <div className="divide-y divide-border-subtle border-y border-border-subtle">{report.payouts.map((entry) => <article key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium text-text-primary">{entry.recipient} · {entry.reversal ? 'Reversal' : entry.reversed ? 'Reversed' : 'Payout'}</p><p className="text-xs text-text-muted">{[entry.reference, entry.note, entry.createdBy ? `Recorded by ${entry.createdBy}` : null].filter(Boolean).join(' · ') || 'Recorded settlement'} · {formatDateTime(entry.paidAt, { includeYear: true })}</p></div>
              <p className="font-semibold tabular-nums text-text-primary">{formatEGP(entry.reversal ? `-${entry.amount}` : entry.amount)}</p>
            </article>)}</div> : <p className="text-sm text-text-muted">No payouts have been recorded.</p>}
            {report.payoutCount > report.payouts.length && <p className="text-xs text-text-muted">Showing latest {report.payouts.length} of {report.payoutCount} payouts.</p>}
          </div>
          <section aria-label="Unaccrued tutor hours" className="space-y-3 border-t border-border-subtle pt-4">
            <div><h3 className="font-semibold text-text-primary">Delivered hours awaiting compensation</h3><p className="text-sm text-text-muted">{hours(report.summary.unaccruedMinutes)} across {report.summary.unaccruedSessionCount} sessions; {hours(report.summary.needsRateReviewMinutes)} need an hourly rate. {report.summary.negativeOutstandingCount} balances are overpaid.</p></div>
            <details>
              <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold text-brand-primary">View rate and accrual review queue</summary>
              <div className="divide-y divide-border-subtle border-y border-border-subtle">{report.unaccrued.map((row) => <article key={row.sessionId} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-text-primary">{row.tutorName} · {row.title}</p><p className="text-xs text-text-muted">{formatDateTime(row.startTime, { includeYear: true })} · {hours(row.deliveredMinutes)} · {row.finalizedAt ? `Finalized ${formatDateTime(row.finalizedAt, { includeYear: true })}` : 'Not finalized'}</p></div><span className="text-sm text-text-muted">{row.needsRateReview ? 'Rate needed' : `Rate ${formatEGP(row.effectiveRate)} · accrual pending`}</span></article>)}</div>
              {report.summary.unaccruedSessionCount > report.unaccrued.length && <p className="pt-2 text-xs text-text-muted">Showing {report.unaccrued.length} of {report.summary.unaccruedSessionCount} sessions.</p>}
            </details>
          </section>
          <section aria-label="Student wallet deductions" className="space-y-2 border-t border-border-subtle pt-4"><h3 className="font-semibold text-text-primary">Student wallet deductions · selected activity period</h3>{report.charges.length ? <div className="divide-y divide-border-subtle border-y border-border-subtle">{report.charges.map((entry) => <article key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-text-primary">{entry.studentName} · {entry.sessionTitle}</p><p className="text-xs text-text-muted">{walletDeductionDetail(entry)} · {formatDateTime(entry.finalizedAt ?? entry.createdAt, { includeYear: true })}</p></div><p className="font-semibold tabular-nums text-text-primary">{formatEGP(entry.amount)}</p></article>)}</div> : <p className="text-sm text-text-muted">No wallet deductions in this date range.</p>}{report.displayedRows.charges > report.charges.length && <p className="text-xs text-text-muted">Showing latest {report.charges.length} of {report.displayedRows.charges} deductions.</p>}</section>
          <form action="/admin/finances" method="get" className="flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-end">
            <label className="flex min-h-[44px] flex-1 flex-col gap-1 text-xs font-semibold text-text-primary">Month preset<input name="month" type="month" defaultValue={report.range.month} className="min-h-[44px] rounded-lg border border-border-strong bg-canvas px-3 text-sm text-text-primary" /></label>
            <button type="submit" className="min-h-[44px] rounded-lg border border-border-strong px-5 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Show month</button>
          </form>
          <div className="space-y-2">
            <h3 className="font-semibold text-text-primary">Activity date range</h3>
            <FinanceDateRangeForm key={`${report.range.from}:${report.range.to}`} from={report.range.from} to={report.range.to} />
          </div>
          <p className="text-xs leading-relaxed text-text-muted">Monthly receivables are expected dues; this system does not record whether external payments were collected. Payouts are Admin-recorded settlements, not bank-reconciled payments. Positive Student wallet balances represent course-service credits; negative balances are Student amounts due. Commission is based on finalized internal wallet charges, not verified cash collection. Historical-only Sessions are excluded; ledger entries keep their original rates and amounts when policy changes.</p>
        </div>
      </details>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs text-text-muted">{label}</p><p className="break-words text-sm font-semibold tabular-nums text-text-primary">{value}</p></div>;
}
