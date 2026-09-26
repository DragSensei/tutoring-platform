'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { AccountDetail } from '../../../_components/accounts-data';
import type { ReferralSourceItem } from '@/features/accounts/server/account-actions';
import { updateAdminAccount } from '../../../actions';
import { Combobox } from '@/shared/components/combobox';
import type { LinkedStudentCandidate } from '@/features/accounts/server/linked-students';

export function AccountEditForm({ account, referralSources, linkedStudentCandidates }: { account: AccountDetail; referralSources: ReferralSourceItem[]; linkedStudentCandidates: LinkedStudentCandidate[] }) {
  const router = useRouter();
  const [name, setName] = React.useState(account.name ?? '');
  const [email, setEmail] = React.useState(account.email ?? '');
  const [phone, setPhone] = React.useState(account.phone ?? '');
  const [sourceId, setSourceId] = React.useState(account.referralSourceId ?? '__none__');
  const [linkedStudentId, setLinkedStudentId] = React.useState(account.role === 'STUDENT' ? account.student.linkedStudent?.id ?? '' : '');
  const [linkStudent, setLinkStudent] = React.useState(account.role === 'STUDENT' && Boolean(account.student.linkedStudent));
  const [hourlyRate, setHourlyRate] = React.useState(account.role === 'TUTOR' ? account.tutor.hourlyRateOverride ?? '' : '');
  const [error, setError] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const input = {
      name,
      email,
      phone,
      ...(account.role === 'STUDENT' ? { referralSourceId: sourceId === '__none__' ? null : sourceId } : {}),
      ...(account.role === 'STUDENT' ? { linkedStudentId: linkedStudentId || null } : {}),
      ...(account.role === 'TUTOR' ? { tutorHourlyRateOverride: hourlyRate.trim() || null } : {}),
    };
    startTransition(async () => {
      try {
        await updateAdminAccount(account.id, input);
        router.push('/admin/accounts?updated=1');
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
        {account.role === 'STUDENT' && <label className="text-xs font-semibold text-text-primary">Referral / sales source<Combobox className="mt-1" value={sourceId} onChange={setSourceId} options={[{ value: '__none__', label: 'None · no attribution' }, ...referralSources.filter((source) => source.isActive || source.id === sourceId).map((source) => ({ value: source.id, label: `${source.name} · ${source.kind.toLowerCase()}${source.isActive ? '' : ' · inactive'}` }))]} searchPlaceholder="Search sources" /></label>}
        {account.role === 'STUDENT' && <section className="space-y-3 rounded-xl border border-border-subtle p-4 sm:col-span-2" aria-labelledby="edit-linked-student-heading"><h2 id="edit-linked-student-heading" className="text-sm font-semibold text-text-primary">Linked Student</h2><label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-text-primary"><input type="checkbox" checked={linkStudent} onChange={(event) => { setLinkStudent(event.target.checked); if (!event.target.checked) setLinkedStudentId(''); }} className="h-5 w-5 accent-brand-primary" />Joined with another Student?</label>{linkStudent && <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-text-primary">Linked Student<Combobox className="mt-1" options={linkedStudentCandidates.map((student) => ({ value: student.id, label: student.name, sublabel: student.email ?? undefined }))} value={linkedStudentId} onChange={setLinkedStudentId} placeholder="Search Students..." searchPlaceholder="Search active unpaired Students" required /></label><p className="self-center text-sm text-text-muted">Linked Student discount<br /><strong className="text-text-primary">100 EGP / month</strong></p></div>}{account.student.linkedStudent && !linkStudent && <p className="text-xs text-status-warning">Saving will explicitly end this linked relationship. Its history will be retained.</p>}{account.student.linkedStudent && linkStudent && linkedStudentId !== account.student.linkedStudent.id && <p className="text-xs text-status-warning">End the current pair and save before linking another Student.</p>}{linkStudent && linkedStudentCandidates.length === 0 && !account.student.linkedStudent && <p className="text-xs text-text-muted">No active unpaired Students are available. Create the second Student and link them later.</p>}{!linkStudent && !account.student.linkedStudent && <p className="text-sm text-text-muted">No linked-student discount entitlement is active.</p>}</section>}
        {account.role === 'TUTOR' && <label className="text-xs font-semibold text-text-primary">Tutor hourly-rate override (EGP)<input type="number" min="0" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="Use platform default" className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" /><span className="mt-1 block font-normal text-text-muted">Leave blank to use the policy default.</span></label>}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-brand-primary">{error}</p>}
      <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.push(`/admin/accounts/${account.id}`)} className="min-h-[44px] rounded-lg border border-border-strong px-4 text-sm font-semibold text-text-primary">Cancel</button>
        <button type="submit" disabled={isPending} className="min-h-[44px] rounded-lg bg-brand-primary px-5 text-sm font-semibold text-brand-subtle disabled:opacity-60">{isPending ? 'Saving…' : 'Save account'}</button>
      </div>
    </form>
  );
}
