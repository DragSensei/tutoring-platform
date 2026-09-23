'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { AccountDetail } from '../../../_components/accounts-data';
import type { ReferralSourceItem } from '@/features/accounts/server/account-actions';
import { updateAdminAccount } from '../../../actions';

export function AccountEditForm({ account, referralSources }: { account: AccountDetail; referralSources: ReferralSourceItem[] }) {
  const router = useRouter();
  const [name, setName] = React.useState(account.name ?? '');
  const [email, setEmail] = React.useState(account.email ?? '');
  const [phone, setPhone] = React.useState(account.phone ?? '');
  const [sourceId, setSourceId] = React.useState(account.referralSourceId ?? '__none__');
  const [hourlyRate, setHourlyRate] = React.useState(account.role === 'TUTOR' ? account.tutor.hourlyRateOverride ?? '' : '');
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    const input = {
      name,
      email,
      phone,
      ...(account.role === 'STUDENT' ? { referralSourceId: sourceId === '__none__' ? null : sourceId } : {}),
      ...(account.role === 'TUTOR' ? { tutorHourlyRateOverride: hourlyRate.trim() || null } : {}),
    };
    startTransition(async () => {
      try {
        await updateAdminAccount(account.id, input);
        setSaved(true);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not save account changes.');
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border-subtle bg-canvas p-5 shadow-xs sm:p-7">
      <div><span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Admin account editor</span><h1 className="mt-1 text-2xl font-bold text-text-primary">Edit {account.role === 'STUDENT' ? 'Student' : 'Tutor'} account</h1><p className="mt-1 text-sm text-text-muted">Account setup status and password credentials are not changed here.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-text-primary">Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" /></label>
        <label className="text-xs font-semibold text-text-primary">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" /></label>
        <label className="text-xs font-semibold text-text-primary">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" /></label>
        {account.role === 'STUDENT' && <label className="text-xs font-semibold text-text-primary">Referral / sales source<select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm"><option value="__none__">None · no attribution</option>{referralSources.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.kind.toLowerCase()}</option>)}</select></label>}
        {account.role === 'TUTOR' && <label className="text-xs font-semibold text-text-primary">Tutor hourly-rate override (EGP)<input type="number" min="0" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="Use platform default" className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" /><span className="mt-1 block font-normal text-text-muted">Leave blank to use the policy default.</span></label>}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-brand-primary">{error}</p>}
      {saved && <p role="status" className="text-sm font-semibold text-brand-primary">Account changes saved.</p>}
      <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.push(`/admin/accounts/${account.id}`)} className="min-h-[44px] rounded-lg border border-border-strong px-4 text-sm font-semibold text-text-primary">Cancel</button>
        <button type="submit" disabled={isPending} className="min-h-[44px] rounded-lg bg-brand-primary px-5 text-sm font-semibold text-brand-subtle disabled:opacity-60">{isPending ? 'Saving…' : 'Save account'}</button>
      </div>
    </form>
  );
}
