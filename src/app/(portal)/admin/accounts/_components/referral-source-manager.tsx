'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createAdminReferralSource } from '../actions';
import type { ReferralSourceItem } from '@/features/accounts/server/account-actions';

export function ReferralSourceManager({ sources }: { sources: ReferralSourceItem[] }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<'REFERRAL' | 'SALES'>('REFERRAL');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

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

  return (
    <details className="rounded-2xl border border-stone-200/80 bg-white shadow-xs">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-stone-900">
        <span>Referral and sales sources</span><span className="text-xs font-medium text-stone-500">{sources.length} active</span>
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
          {sources.map((source) => <li key={source.id} className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-2 text-sm"><span className="min-w-0 break-words font-medium text-stone-800">{source.name}</span><span className="shrink-0 text-xs text-stone-500">{source.kind === 'DIRECT' ? 'Direct' : source.kind === 'SALES' ? 'Sales' : 'Referral'}</span></li>)}
        </ul>
      </div>
    </details>
  );
}
