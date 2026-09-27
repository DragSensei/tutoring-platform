'use client';

import * as React from 'react';
import { Check, Copy, UserPlus } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Combobox } from '@/shared/components/combobox';
import { createAdminAccount } from '../actions';
import type { ReferralSourceItem } from '@/features/accounts/server/account-actions';
import type { LinkedStudentCandidate } from '@/features/accounts/server/linked-students';

export function AccountCreateForm({ referralSources, linkedStudentCandidates }: { referralSources: ReferralSourceItem[]; linkedStudentCandidates: LinkedStudentCandidate[] }) {
  const [isPending, startTransition] = React.useTransition();
  const [role, setRole] = React.useState<'STUDENT' | 'TUTOR'>('STUDENT');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [referralSourceId, setReferralSourceId] = React.useState('__none__');
  const [linkStudent, setLinkStudent] = React.useState(false);
  const [linkedStudentId, setLinkedStudentId] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [setupUrl, setSetupUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const account = await createAdminAccount({ role, name, email, phone, referralSourceId: role === 'STUDENT' && referralSourceId !== '__none__' ? referralSourceId : null, linkedStudentId: role === 'STUDENT' && linkStudent ? linkedStudentId : null });
        const setupUrl = `${window.location.origin}/login/setup?token=${encodeURIComponent(account.setupToken)}`;
        setMessage(`Created ${account.role} account. Share this one-time setup link before it expires.`);
        setSetupUrl(setupUrl);
        setCopied(false);
        setName('');
        setEmail('');
        setPhone('');
        setReferralSourceId('__none__');
        setLinkStudent(false);
        setLinkedStudentId('');
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Unable to create this account');
      }
    });
  }

  return (
    <details className="w-fit max-w-full [&[open]]:w-full">
      <summary className="inline-flex min-h-[44px] w-fit cursor-pointer list-none items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"><UserPlus className="h-4 w-4" aria-hidden="true" />Create Account</summary>
      <form onSubmit={submit} className="mt-4 grid w-full gap-4 rounded-2xl border border-border-subtle bg-canvas p-5 shadow-xs md:grid-cols-4">
        <p className="text-sm text-text-muted md:col-span-4">No password entry or retrieval; new accounts use a one-time setup link.</p>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Account type</span><Combobox options={[{ value: 'STUDENT', label: 'Student', sublabel: 'May be partial' }, { value: 'TUTOR', label: 'Tutor', sublabel: 'Requires complete profile' }]} value={role} onChange={(value) => { const nextRole = value as typeof role; setRole(nextRole); if (nextRole === 'TUTOR') setReferralSourceId('__none__'); }} placeholder="Select account type" searchPlaceholder="Search account types" required /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Name {role === 'STUDENT' && <span className="font-normal text-stone-400">(if known)</span>}</span><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Email {role === 'STUDENT' && <span className="font-normal text-stone-400">(if known)</span>}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Phone {role === 'STUDENT' && <span className="font-normal text-stone-400">(if known)</span>}</span><input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
        {role === 'STUDENT' && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Referral / sales source</span><Combobox options={[{ value: '__none__', label: 'None', sublabel: 'No attribution' }, ...referralSources.filter((source) => source.isActive).map((source) => ({ value: source.id, label: source.name, sublabel: source.kind === 'DIRECT' ? 'Direct' : source.kind === 'SALES' ? 'Sales source' : 'Referral source' }))]} value={referralSourceId} onChange={setReferralSourceId} placeholder="Select source" searchPlaceholder="Search referral sources" /></label>}
        {role === 'STUDENT' && <section className="space-y-3 rounded-xl border border-stone-200 p-4 md:col-span-4" aria-labelledby="create-linked-student-heading"><h3 id="create-linked-student-heading" className="text-sm font-semibold text-stone-900">Linked Student</h3><label className="flex min-h-[44px] items-center gap-3 text-sm text-stone-700"><input type="checkbox" checked={linkStudent} onChange={(event) => setLinkStudent(event.target.checked)} className="h-5 w-5 accent-brand-primary" />Joined with another Student?</label>{linkStudent && <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Linked Student</span><Combobox options={linkedStudentCandidates.map((student) => ({ value: student.id, label: student.name, sublabel: student.email ?? undefined }))} value={linkedStudentId} onChange={setLinkedStudentId} placeholder="Search Students..." searchPlaceholder="Search active Students" required />{linkedStudentCandidates.length === 0 && <span className="mt-1 block text-xs text-stone-500">No active unpaired Students are available. Create the second Student and link them later from account edit.</span>}</label><p className="self-center text-sm text-stone-600">Linked Student discount<br /><strong className="text-stone-900">100 EGP / month</strong></p></div>}</section>}
        <div className="flex items-end md:col-span-4"><Button type="submit" disabled={isPending} isLoading={isPending} className="min-h-[44px]">Create and issue setup link</Button></div>
        {message && setupUrl && <div role="status" className="rounded-lg border border-brand-border bg-brand-subtle px-3 py-2.5 text-sm text-stone-700 md:col-span-4"><p>{message}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><code className="min-h-[44px] min-w-0 flex-1 break-all rounded-lg border border-brand-border/70 bg-white px-3 py-2.5 text-xs text-stone-700">{setupUrl}</code><Button type="button" variant="outline" className="min-h-[44px] shrink-0" onClick={() => { void navigator.clipboard.writeText(setupUrl).then(() => setCopied(true)); }}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? 'Copied' : 'Copy link'}</Button></div></div>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 md:col-span-4">{error}</p>}
      </form>
    </details>
  );
}

const inputClass = 'min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';
