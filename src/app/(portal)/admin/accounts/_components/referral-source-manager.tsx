'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createAdminReferralSource, updateAdminReferralSource } from '../actions';
import type { ReferralSourceItem } from '@/features/accounts/server/account-actions';

export function ReferralSourceManager({ sources }: { sources: ReferralSourceItem[] }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<'REFERRAL' | 'SALES'>('REFERRAL');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  const [sourceEdits, setSourceEdits] = React.useState<Record<string, string>>({});

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await createAdminReferralSource({ name, kind });
        setName('');
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not add this source.');
      }
    });
  }

  function updateSource(source: ReferralSourceItem, values: { name?: string; kind?: 'REFERRAL' | 'SALES'; isActive?: boolean }) {
    setError('');
    startTransition(async () => {
      try {
        await updateAdminReferralSource({ id: source.id, ...values });
        router.refresh();
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this source.'); }
    });
  }

  return (
    <details className="rounded-2xl border border-stone-200/80 bg-white shadow-xs">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-stone-900">
        <span>Referral and sales sources</span><span className="text-xs font-medium text-stone-500">{sources.filter((source) => source.isActive).length} active</span>
      </summary>
      <div className="grid gap-5 border-t border-stone-100 p-5 xl:grid-cols-[1fr_1.2fr]">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-semibold text-stone-700">Source name
            <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 text-sm" />
          </label>
          <label className="text-xs font-semibold text-stone-700">Source type
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 text-sm">
              <option value="REFERRAL">Referral</option><option value="SALES">Sales</option>
            </select>
          </label>
          <button type="submit" disabled={isPending} className="min-h-[44px] rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Adding…' : 'Add source'}</button>
          {error && <p role="alert" className="text-sm text-brand-primary sm:col-span-3">{error}</p>}
        </form>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sources.map((source) => <li key={source.id} className="grid min-w-0 gap-2 rounded-lg border border-stone-100 p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium text-stone-800">{source.kind === 'DIRECT' ? 'Direct · protected' : source.name}</span><span className="text-xs text-stone-500">{source.attributedStudents ?? 0} students · {source.commissionEntries ?? 0} commission entries</span></div>{(source.attributedStudents ?? 0) > 0 && <Link href={`/admin/accounts?referralSourceId=${encodeURIComponent(source.id)}`} className="min-h-[44px] inline-flex items-center font-semibold text-brand-primary">View attributed Students</Link>}{(source.commissionEntries ?? 0) > 0 && <Link href={`/admin/finances/payables/source/${encodeURIComponent(source.id)}`} className="min-h-[44px] inline-flex items-center font-semibold text-brand-primary">View commission provenance</Link>}{source.kind !== 'DIRECT' && <><div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input aria-label={`Rename ${source.name}`} value={sourceEdits[source.id] ?? source.name} onChange={(event) => setSourceEdits((prev) => ({ ...prev, [source.id]: event.target.value }))} className="min-h-[44px] min-w-0 rounded-lg border border-stone-200 px-3" /><select aria-label={`Type for ${source.name}`} value={source.kind} onChange={(event) => updateSource(source, { kind: event.target.value as 'REFERRAL' | 'SALES' })} className="min-h-[44px] rounded-lg border border-stone-200 px-3"><option value="REFERRAL">Referral</option><option value="SALES">Sales</option></select><button type="button" disabled={isPending} onClick={() => updateSource(source, { name: sourceEdits[source.id] ?? source.name })} className="min-h-[44px] rounded-lg border border-stone-200 px-3 font-semibold">Save name</button></div><button type="button" disabled={isPending} onClick={() => updateSource(source, { isActive: !source.isActive })} className="min-h-[44px] justify-self-start rounded-lg border border-stone-200 px-3 font-semibold">{source.isActive ? 'Deactivate source' : 'Reactivate source'}</button></>}</li>)}
        </ul>
      </div>
    </details>
  );
}
