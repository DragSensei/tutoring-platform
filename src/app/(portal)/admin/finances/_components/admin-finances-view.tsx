import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import Link from 'next/link';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import { FinanceDateRangeForm } from './finance-date-range-form';

type FinanceReport = Awaited<ReturnType<typeof import('@/features/finances/server/finance-actions').getAdminFinanceReport>>;

function hours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}

function dateTime(value: string | null) {
  return value ? formatDateTime(value, { includeYear: true }) : '—';
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="border-border-subtle bg-canvas shadow-xs">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-2 tabular-nums text-2xl font-bold text-text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function AdminFinancesView({ report }: { report: FinanceReport }) {
  return (
    <div className="w-full min-w-0 space-y-7">
      <header className="flex min-h-[92px] flex-col justify-center gap-2 border-b border-stone-200/80 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-border-strong text-text-muted">Admin Console</Badge>
          <span className="text-xs font-semibold text-text-muted">Financial operations</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Finances</h1>
        <p className="text-sm text-text-muted">Finalized tutor delivery, wallet charges, compensation snapshots, and commission provenance.</p>
      </header>

      <Card className="border-border-subtle bg-canvas shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col gap-5">
            <form action="/admin/finances" method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex min-h-[44px] flex-1 flex-col gap-1 text-xs font-semibold text-text-primary">Month preset
                <input name="month" type="month" defaultValue={report.range.month} className="min-h-[44px] rounded-lg border border-border-strong bg-canvas px-3 text-sm text-text-primary" />
              </label>
              <button type="submit" className="min-h-[44px] rounded-lg border border-border-strong px-5 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Show month</button>
            </form>
            <FinanceDateRangeForm key={`${report.range.from}:${report.range.to}`} from={report.range.from} to={report.range.to} />
          </div>
        </CardContent>
      </Card>

      <section aria-label="Finance totals" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tutor delivery" value={hours(report.summary.deliveredMinutes)} detail={`${hours(report.summary.compensatedMinutes)} has a compensation snapshot`} />
        <SummaryCard label="Tutor compensation" value={formatEGP(report.summary.tutorCompensation)} detail="Immutable tutor ledger entries" />
        <SummaryCard label="Commission accrued" value={formatEGP(report.summary.commission)} detail={`${report.policy.commissionEnabled ? `${report.policy.commissionRateBps / 100}% enabled` : 'Disabled'} · rule v${report.policy.commissionRuleVersion}`} />
        <SummaryCard label="System wallet charges" value={formatEGP(report.summary.systemTrackedCharges)} detail="Session deductions linked to non-historical sessions" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="border-brand-border bg-brand-subtle shadow-xs">
          <CardHeader className="pb-3"><CardTitle className="text-base">Delivered hours without pay</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="tabular-nums text-2xl font-bold text-text-primary">{hours(report.summary.unaccruedMinutes)}</p>
            <p className="text-sm text-text-primary">{hours(report.summary.needsRateReviewMinutes)} need an hourly rate before compensation can accrue.</p>
            <p className="text-xs text-text-muted">Default tutor rate: {formatEGP(report.policy.defaultTutorHourlyRate)}. Existing snapshots are not recalculated.</p>
          </CardContent>
        </Card>
        <Card className="border-border-subtle bg-canvas shadow-xs">
          <CardHeader className="pb-3"><CardTitle className="text-base">Rate review queue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {report.unaccrued.length ? report.unaccrued.map((row) => (
              <div key={row.sessionId} className="flex flex-col gap-1 border-b border-stone-100 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{row.title}</p>
                  <p className="text-xs text-text-muted">{row.tutorName} · {dateTime(row.startTime)} · {hours(row.deliveredMinutes)}</p>
                </div>
                <Badge variant="outline" className={row.needsRateReview ? 'border-brand-border bg-brand-subtle text-brand-primary' : 'border-border-strong text-text-muted'}>{row.needsRateReview ? 'Rate needed' : 'Accrual pending'}</Badge>
              </div>
            )) : <p className="text-sm text-text-muted">No delivered hours are awaiting compensation.</p>}
            {report.summary.unaccruedSessionCount > report.unaccrued.length && <p className="text-xs text-text-muted">Showing 100 of {report.summary.unaccruedSessionCount} sessions.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Ledger title="Tutor compensation ledger" empty="No compensation entries in this date range." rows={report.compensation.map((entry) => ({
          id: entry.id,
          title: entry.tutorName,
          detail: `${hours(entry.deliveredMinutes)} × ${formatEGP(entry.hourlyRate)} / h`,
          amount: formatEGP(entry.amount),
          timestamp: entry.createdAt,
          links: [{ label: 'Session record', href: `/admin/finances/sessions/${encodeURIComponent(entry.sessionId)}` }, { label: 'Tutor', href: `/admin/accounts/${entry.tutorId}` }],
        }))} totalCount={report.displayedRows.compensation} />
        <Ledger title="Commission ledger" empty="No commission entries in this date range." rows={report.commissions.map((entry) => ({
          id: entry.id,
          title: `${entry.recipientSource} · ${entry.studentName}`,
          detail: `${entry.rateBps / 100}% of ${formatEGP(entry.basisAmount)} · ${entry.basis} · rule v${entry.ruleVersion}`,
          amount: formatEGP(entry.amount),
          timestamp: entry.createdAt,
          provenance: `Wallet event ${entry.sourceWalletTransactionId}`,
          links: [
            { label: 'Session record', href: `/admin/finances/sessions/${encodeURIComponent(entry.sessionId)}` },
            { label: 'Student', href: `/admin/accounts/${entry.studentId}` },
            { label: 'Source accounts', href: `/admin/accounts?referralSourceId=${encodeURIComponent(entry.sourceId)}` },
          ],
        }))} totalCount={report.displayedRows.commissions} />
      </section>

      <Ledger title="System session charges" empty="No system tracked charges in this date range." rows={report.charges.map((entry) => ({
        id: entry.id,
        title: 'Finalized session wallet deduction',
        detail: formatEGP(entry.amount),
        amount: formatEGP(entry.amount),
        timestamp: entry.createdAt,
        links: entry.sessionId ? [{ label: 'Session record', href: `/admin/finances/sessions/${encodeURIComponent(entry.sessionId)}` }] : [],
      }))} totalCount={report.displayedRows.charges} />

      <p className="text-xs leading-relaxed text-text-muted">Commission basis is a finalized internal wallet charge, not proof of external cash collection. Historical-only sessions are excluded. Ledger entries retain their original rates and amounts when policy changes.</p>
    </div>
  );
}

function Ledger({ title, empty, rows, totalCount = rows.length }: { title: string; empty: string; rows: Array<{ id: string; title: string; detail: string; amount: string; timestamp: string; provenance?: string; links?: Array<{ label: string; href: string }> }>; totalCount?: number }) {
  return (
    <Card className="min-w-0 border-border-subtle bg-canvas shadow-xs">
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? rows.map((row) => (
          <article key={row.id} className="flex min-w-0 flex-col gap-2 border-b border-stone-100 pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-text-primary">{row.title}</p>
              <p className="break-words text-xs text-text-muted">{row.detail}</p>
              {row.provenance && <p className="break-all text-[11px] text-text-subtle">{row.provenance}</p>}
              <p className="text-[11px] text-text-muted">{dateTime(row.timestamp)}</p>
              {!!row.links?.length && <nav aria-label={`${row.title} drill-down`} className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{row.links.map((link) => <Link key={link.label} href={link.href} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-primary underline-offset-2 hover:underline">{link.label}</Link>)}</nav>}
            </div>
            <p className="shrink-0 tabular-nums text-sm font-bold text-text-primary">{row.amount}</p>
          </article>
        )) : <p className="text-sm text-text-muted">{empty}</p>}
        {totalCount > rows.length && <p className="text-xs text-text-muted">Showing latest {rows.length} of {totalCount}; totals include all entries in the date range.</p>}
      </CardContent>
    </Card>
  );
}
