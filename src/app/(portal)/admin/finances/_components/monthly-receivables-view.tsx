'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { DatePicker } from '@/shared/components/date-picker';
import { FinanceNavigation } from './finance-navigation';
import { presentMonthlyReceivableRow } from './monthly-receivables-presentation';
import type { MonthlyBillingAttentionItem, MonthlyReceivablePreview } from './monthly-receivables-types';

interface MonthlyReceivablesViewProps {
  onPreview?: (periodStart: string, periodEnd: string) => Promise<MonthlyReceivablePreview>;
  onConfirm?: (preview: MonthlyReceivablePreview) => Promise<{ created: number; alreadyExists: number; blocked: number }>;
  attention?: MonthlyBillingAttentionItem[];
}

const attentionLabels: Record<MonthlyBillingAttentionItem['category'], string> = {
  monthly_price_missing: 'Monthly price missing',
  ambiguous_billing_enrollment: 'Ambiguous billing enrollment',
  partial_period_linked_relationship: 'Linked relationship covers part of this period',
  receivable_generation_failure: 'Receivable generation failed',
  pricing_change: 'Monthly price changes during period',
  duplicate_receivable: 'Receivable already exists',
  negative_due: 'Discount exceeds base price',
};

export function MonthlyReceivablesView({ onPreview, onConfirm, attention }: MonthlyReceivablesViewProps = {}) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [preview, setPreview] = useState<MonthlyReceivablePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ created: number; alreadyExists: number; blocked: number } | null>(null);
  const [attentionItems, setAttentionItems] = useState(attention);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loadPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onPreview || !periodStart || !periodEnd) return;
    setError(null);
    setConfirmed(false);
    setConfirming(false);
    setConfirmResult(null);
    startTransition(async () => {
      try { const next = await onPreview(periodStart, periodEnd); setPreview(next); setAttentionItems(next.attention); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to preview receivables.'); }
    });
  }

  function confirmGeneration() {
    if (!preview || !canConfirmPreview(preview) || !onConfirm) return;
    setConfirming(true);
  }

  function generateReceivables() {
    if (!preview || !canConfirmPreview(preview) || !onConfirm) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await onConfirm(preview);
        setConfirmResult(result);
        setConfirmed(result.created > 0);
        setConfirming(false);
        const next = await onPreview?.(preview.periodStart, preview.periodEnd);
        if (next) { setPreview(next); setAttentionItems(next.attention); }
      }
      catch (cause) {
        const details = cause instanceof Error ? cause.message : 'Receivable generation failed.';
        setError(details);
        setAttentionItems([{ id: 'generation-failure', category: 'receivable_generation_failure', studentName: 'Billing period', details }, ...(attentionItems ?? [])]);
      }
    });
  }

  return (
    <div className="w-full min-w-0 space-y-7">
      <header className="flex min-h-[92px] flex-col justify-start gap-2 border-b border-border-subtle pb-5">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Admin Console</Badge><span className="text-xs font-semibold text-text-muted">Financial operations</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Student receivables</h1>
        <p className="text-sm text-text-muted">Preview expected amounts for an explicit billing period, then review before generation.</p>
      </header>
      <FinanceNavigation active="Student receivables" />

      <Card className="border-border-subtle bg-canvas shadow-xs">
        <CardHeader><CardTitle className="text-base">Billing period</CardTitle><p className="text-sm text-text-muted">Choose both dates. The period is supplied explicitly; no month or Session count is assumed.</p></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-text-muted">Start is inclusive; end is exclusive.</p>
          <form onSubmit={loadPreview} className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="block min-w-0 text-xs font-semibold text-text-primary">Period start<DatePicker aria-label="Period start" value={periodStart} onChange={setPeriodStart} clearable={false} /></label>
            <label className="block min-w-0 text-xs font-semibold text-text-primary">Period end (exclusive)<DatePicker aria-label="Period end (exclusive)" value={periodEnd} onChange={setPeriodEnd} clearable={false} /></label>
            <button type="submit" disabled={!onPreview || !periodStart || !periodEnd || isPending} className="min-h-[44px] rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-brand-subtle disabled:cursor-not-allowed disabled:opacity-50">{isPending ? 'Loading preview…' : 'Preview receivables'}</button>
          </form>
          {!onPreview && <p className="mt-4 rounded-lg border border-brand-border bg-brand-subtle p-3 text-sm text-text-primary">Preview is unavailable until the monthly receivables API is connected.</p>}
        </CardContent>
      </Card>

      <Card className="border-border-subtle bg-canvas shadow-xs">
        <CardHeader><CardTitle className="text-base">Needs attention</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!preview && <p className="text-sm text-text-muted">Choose a period and preview to see billing items that need attention.</p>}
          {preview && attentionItems?.length === 0 && <p className="text-sm text-text-muted">No billing items need attention for this period.</p>}
          {preview && attentionItems?.map((item) => <article key={item.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-status-warning p-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold text-text-primary">{attentionLabels[item.category]} · {item.studentName}</p><p className="mt-1 break-words text-sm text-text-muted">{item.details}</p></div>{item.href && <Link href={item.href} className="inline-flex min-h-[44px] shrink-0 items-center font-semibold text-brand-primary">Review</Link>}</article>)}
        </CardContent>
      </Card>

      {error && !confirming && <p role="alert" className="rounded-lg border border-status-error bg-canvas p-3 text-sm text-status-error">{error}</p>}
      {preview && <section aria-labelledby="receivables-preview-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="receivables-preview-heading" className="text-lg font-semibold text-text-primary">Preview</h2><p className="text-sm text-text-muted">{preview.periodStart} – {preview.periodEnd} (end exclusive) · {preview.rows.length} Students</p></div>
          {onConfirm && <button type="button" onClick={confirmGeneration} disabled={!canConfirmPreview(preview) || isPending || confirmed} className="min-h-[44px] rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-brand-subtle disabled:cursor-not-allowed disabled:opacity-50">{confirmed ? 'Receivables generated' : 'Confirm generation'}</button>}
        </div>
        {!onConfirm && <p className="rounded-lg border border-brand-border bg-brand-subtle p-3 text-sm text-text-primary">Generation is unavailable until the receivable mutation is connected.</p>}
        <ConfirmDialog open={confirming} title="Generate receivables?" description={`Generate receivables for ${preview.periodStart} – ${preview.periodEnd}? This records expected dues and does not record external payment.`} confirmLabel="Generate receivables" cancelLabel="Back" pending={isPending} error={error} onCancel={() => setConfirming(false)} onConfirm={generateReceivables} />
        {preview.rows.some((row) => !row.canGenerate) && <p className="rounded-lg border border-status-warning bg-canvas p-3 text-sm text-text-primary">Blocked Students remain visible with reasons; confirmation creates only ready rows.</p>}
        {confirmResult && <p role="status" className="rounded-lg border border-border-subtle bg-canvas p-3 text-sm text-text-primary">Created {confirmResult.created}; already existed {confirmResult.alreadyExists}; still blocked {confirmResult.blocked}. No external payment is recorded.</p>}
        <div className="grid min-w-0 gap-3">{preview.rows.map((row) => {
          const display = presentMonthlyReceivableRow(row);
          return <article key={row.studentId} className="min-w-0 rounded-xl border border-border-subtle bg-canvas p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-text-primary">{row.studentName}</h3><p className="mt-1 break-words text-sm text-text-muted">{display.enrollment}</p></div><Badge variant="outline" className={display.state === 'ready' ? 'border-brand-border text-brand-primary' : 'border-status-warning text-text-primary'}>{display.state === 'ready' ? 'Ready' : 'Blocked'}</Badge></div>
            <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-border-subtle pt-4 sm:grid-cols-3"><MoneyField label="Base monthly price" value={display.basePrice} /><MoneyField label="Linked discount" value={display.discount} /><MoneyField label="Expected amount" value={display.expectedAmount} emphasized /></dl>
            {display.warnings.length > 0 && <ul className="mt-3 space-y-1 text-sm text-text-muted">{display.warnings.map((warning) => <li key={warning}>Warning: {warning}</li>)}</ul>}
            {display.reasons.length > 0 && <ul className="mt-3 space-y-1 text-sm font-medium text-text-primary" aria-label="Reasons generation is blocked">{display.reasons.map((reason) => <li key={reason}>Cannot generate: {reason}</li>)}</ul>}
          </article>;
        })}</div>
        <p className="text-xs text-text-muted">Expected amounts are billing estimates. This preview does not indicate cash received.</p>
      </section>}
    </div>
  );
}

function canConfirmPreview(preview: MonthlyReceivablePreview) {
  return preview.canConfirm && preview.rows.some((row) => row.canGenerate);
}

function MoneyField({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return <div><dt className="text-xs font-semibold text-text-muted">{label}</dt><dd className={`mt-1 tabular-nums ${emphasized ? 'text-base font-bold text-text-primary' : 'text-sm font-medium text-text-primary'}`}>{value}</dd></div>;
}
