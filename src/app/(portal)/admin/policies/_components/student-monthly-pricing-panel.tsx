'use client';

import * as React from 'react';
import { createStudentMonthlyPricingPolicy } from '@/features/policies/server/policy-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { DatePicker } from '@/shared/components/date-picker';
import { formatEGP } from '@/shared/utils/currency';

type Policy = { id: string; effectiveFrom: string; groupPrice: string; privatePrice: string; createdAt: string };

export function StudentMonthlyPricingPanel({ policies }: { policies: Policy[] }) {
  const [rows, setRows] = React.useState(policies);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState('');
  const [effectiveFrom, setEffectiveFrom] = React.useState('');
  const [groupPrice, setGroupPrice] = React.useState('');
  const [privatePrice, setPrivatePrice] = React.useState('');

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    startTransition(async () => {
      const result = await createStudentMonthlyPricingPolicy({ effectiveFrom, groupPrice, privatePrice });
      if (!result.success) { setMessage(result.message ?? 'Could not save prices.'); return; }
      setRows((current) => [{ id: effectiveFrom, effectiveFrom, groupPrice: Number(groupPrice).toFixed(2), privatePrice: Number(privatePrice).toFixed(2), createdAt: new Date().toISOString() }, ...current].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)));
      setMessage('Monthly prices saved. Earlier billing records keep their snapshots.');
      setEffectiveFrom(''); setGroupPrice(''); setPrivatePrice('');
    });
  }

  return <Card className="border-border-subtle bg-canvas"><CardHeader><CardTitle className="text-base">Student monthly prices</CardTitle><p className="text-sm text-text-muted">Configure GROUP and PRIVATE prices separately. A new effective date creates a price version.</p></CardHeader><CardContent className="space-y-5">
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="grid min-w-0 gap-1 text-sm font-medium">Effective from<DatePicker aria-label="Monthly price effective from" value={effectiveFrom} onChange={setEffectiveFrom} clearable={false} /></label>
      <label className="grid gap-1 text-sm font-medium">GROUP monthly price (EGP)<input required inputMode="decimal" pattern="(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?" value={groupPrice} onChange={(event) => setGroupPrice(event.target.value)} className="min-h-[44px] min-w-0 rounded-lg border border-border-subtle bg-canvas px-3" /></label>
      <label className="grid gap-1 text-sm font-medium">PRIVATE monthly price (EGP)<input required inputMode="decimal" pattern="(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?" value={privatePrice} onChange={(event) => setPrivatePrice(event.target.value)} className="min-h-[44px] min-w-0 rounded-lg border border-border-subtle bg-canvas px-3" /></label>
      <button disabled={pending} className="mt-auto min-h-[44px] rounded-lg bg-brand-primary px-4 font-semibold text-white disabled:opacity-60">{pending ? 'Saving…' : 'Add price version'}</button>
    </form>
    {message && <p role="status" className="text-sm text-text-primary">{message}</p>}
    <div className="space-y-2">{rows.length ? rows.map((row) => <div key={row.id} className="flex flex-wrap justify-between gap-2 border-t border-border-subtle pt-3 text-sm"><span>Effective {row.effectiveFrom}</span><span>GROUP {formatEGP(Number(row.groupPrice))} · PRIVATE {formatEGP(Number(row.privatePrice))}</span></div>) : <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm text-text-muted">No monthly prices are configured. Billing previews will remain blocked until configured.</p>}</div>
  </CardContent></Card>;
}
