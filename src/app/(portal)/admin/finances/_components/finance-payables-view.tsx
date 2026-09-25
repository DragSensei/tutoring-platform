import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import { FinanceNavigation } from './finance-navigation';
import { PayoutForm } from './payout-form';

type Report = Awaited<ReturnType<typeof import('@/features/finances/server/finance-actions').getAdminFinanceReport>>;
type Mode = 'tutor' | 'sales';

export function FinancePayablesView({ report, mode }: { report: Report; mode: Mode }) {
  const tutors = mode === 'tutor';
  const rows = tutors
    ? report.tutorPayables.map((row) => ({ ...row, detail: `${(row.deliveredMinutes / 60).toFixed(1)} finalized hours`, type: 'tutor' }))
    : report.salesPayables.map((row) => ({ ...row, detail: `${row.kind} · ${formatEGP(row.basisAmount)} wallet-charge basis`, type: 'source' }));
  const options = rows.filter(({ outstanding }) => Number(outstanding) > 0).map((row) => ({
    value: `${tutors ? 'tutor' : 'source'}:${row.id}`,
    label: `${row.name} · ${formatEGP(row.outstanding)} outstanding`,
  }));
  const activity = tutors
    ? report.compensation.map((entry) => ({ id: entry.id, sessionId: entry.sessionId, title: entry.tutorName, detail: `${(entry.deliveredMinutes / 60).toFixed(1)} h · ${formatDateTime(entry.createdAt, { includeYear: true })}`, amount: entry.amount }))
    : report.commissions.map((entry) => ({ id: entry.id, sessionId: entry.sessionId, title: entry.recipientSource, detail: `${entry.studentName} · ${formatDateTime(entry.createdAt, { includeYear: true })}`, amount: entry.amount }));
  const activityCount = tutors ? report.displayedRows.compensation : report.displayedRows.commissions;
  const activityTotal = tutors ? report.summary.tutorCompensation : report.summary.commission;
  const title = tutors ? 'Tutor payables' : 'Sales & referral payables';
  return <div className="w-full min-w-0 space-y-6">
    <header className="flex min-h-[92px] flex-col justify-center gap-2 border-b border-border-subtle pb-5"><p className="text-xs font-semibold text-text-muted">Admin Console · Financial operations</p><h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{title}</h1><p className="text-sm text-text-muted">Balances use lifetime earnings less lifetime recorded payouts.</p></header>
    <FinanceNavigation active={title === 'Tutor payables' ? 'Tutor payables' : 'Sales & referrals'} />
    <form action={tutors ? '/admin/finances/tutors' : '/admin/finances/sales'} method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex min-h-[44px] flex-1 flex-col gap-1 text-xs font-semibold text-text-primary">Activity cycle, starting on the 22nd
        <input name="cycle" type="month" defaultValue={report.range.cycleMonth} className="min-h-[44px] rounded-lg border border-border-strong bg-canvas px-3 text-sm text-text-primary" />
      </label>
      <button type="submit" className="min-h-[44px] rounded-lg border border-border-strong px-5 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Show cycle</button>
      <p className="text-xs text-text-muted sm:max-w-xs">{report.range.from} 00:00 through {report.range.cycleUntilLabel} 00:00 Cairo time; the ending boundary is exclusive.</p>
    </form>
    <Card className="border-border-subtle bg-canvas shadow-xs"><CardHeader><CardTitle className="text-base">Lifetime balances</CardTitle></CardHeader><CardContent className="space-y-3">
      {rows.length ? rows.map((row) => <article key={row.id} className="flex flex-col gap-2 border-b border-border-subtle pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><Link href={`/admin/finances/payables/${row.type}/${encodeURIComponent(row.id)}`} className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary">{row.name}</Link><p className="text-xs text-text-muted">{row.detail} · earned {formatEGP(row.earned)} · paid {formatEGP(row.paid)}</p></div><p className="text-sm font-bold tabular-nums">Outstanding {formatEGP(row.outstanding)}</p></article>) : <p className="text-sm text-text-muted">No {tutors ? 'Tutor compensation has' : 'sales or referral commissions have'} accrued.</p>}
    </CardContent></Card>
    <Card className="border-border-subtle bg-canvas shadow-xs"><CardHeader><CardTitle className="text-base">Earnings in selected cycle · {formatEGP(activityTotal)}</CardTitle></CardHeader><CardContent className="space-y-3">
      {activity.length ? activity.map((entry) => <article key={entry.id} className="flex min-w-0 flex-col gap-2 border-b border-border-subtle pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-text-primary">{entry.title}</p><p className="text-xs text-text-muted">{entry.detail}</p><Link href={`/admin/finances/sessions/${encodeURIComponent(entry.sessionId)}`} className="inline-flex min-h-[44px] items-center font-semibold text-brand-primary">Session record</Link></div><p className="font-bold tabular-nums text-text-primary">{formatEGP(entry.amount)}</p></article>) : <p className="text-sm text-text-muted">No {tutors ? 'Tutor earnings' : 'sales or referral commissions'} were recorded in this cycle.</p>}
      {activityCount > activity.length && <p className="text-xs text-text-muted">Showing latest {activity.length} of {activityCount} entries; the total includes all entries in the cycle.</p>}
    </CardContent></Card>
    <Card className="border-border-subtle bg-canvas shadow-xs"><CardHeader><CardTitle className="text-base">Record a {tutors ? 'Tutor' : 'sales or referral'} payout</CardTitle></CardHeader><CardContent><PayoutForm initialKey={randomUUID()} options={options} /></CardContent></Card>
  </div>;
}
