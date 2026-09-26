import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatEGP } from '@/shared/utils/currency';

interface MonthlyReceivableSnapshot {
  id: string;
  periodStart: string;
  periodEnd: string;
  enrollmentLabel: string;
  baseMonthlyPriceSnapshot: number;
  linkedDiscountSnapshot: number;
  expectedDueSnapshot: number;
  generatedAt: string;
}

export function MonthlyReceivableHistory({ items }: { items: MonthlyReceivableSnapshot[] }) {
  return (
    <Card className="min-w-0 border-border-subtle bg-canvas shadow-xs">
      <CardHeader><CardTitle className="text-base">Monthly receivable history</CardTitle><p className="text-sm text-text-muted">Snapshot values recorded on each receivable.</p></CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="py-4 text-sm text-text-muted">No monthly receivables recorded.</p>}
        {items.map((item) => <article key={item.id} className="min-w-0 rounded-lg border border-border-subtle p-4">
          <div><p className="font-semibold text-text-primary">{item.periodStart} – {item.periodEnd} (end exclusive)</p><p className="mt-1 break-words text-sm text-text-muted">{item.enrollmentLabel}</p></div>
          <dl className="mt-3 grid grid-cols-1 gap-3 border-t border-border-subtle pt-3 sm:grid-cols-3"><HistoryField label="Base monthly price" amount={item.baseMonthlyPriceSnapshot} /><HistoryField label="Linked discount" amount={item.linkedDiscountSnapshot} negative={item.linkedDiscountSnapshot > 0} /><HistoryField label="Expected due" amount={item.expectedDueSnapshot} /></dl>
          <p className="mt-3 text-xs text-text-muted">Generated {item.generatedAt}. Snapshot values remain as recorded.</p>
        </article>)}
      </CardContent>
    </Card>
  );
}

function HistoryField({ label, amount, negative = false }: { label: string; amount: number; negative?: boolean }) {
  return <div><dt className="text-xs font-semibold text-text-muted">{label}</dt><dd className="mt-1 tabular-nums text-sm font-medium text-text-primary">{negative ? '−' : ''}{formatEGP(amount)}</dd></div>;
}
