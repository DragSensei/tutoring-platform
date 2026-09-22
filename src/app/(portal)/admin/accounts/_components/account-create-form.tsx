'use client';

import * as React from 'react';
import { Check, Copy, UserPlus } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Combobox } from '@/shared/components/combobox';
import { createAdminAccount } from '../actions';

export function AccountCreateForm() {
  const [isPending, startTransition] = React.useTransition();
  const [role, setRole] = React.useState<'STUDENT' | 'TUTOR'>('STUDENT');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
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
        const account = await createAdminAccount({ role, name, email, phone });
        const setupUrl = `${window.location.origin}/login/setup?token=${encodeURIComponent(account.setupToken)}`;
        setMessage(`Created ${account.role} account. Share this one-time setup link before it expires.`);
        setSetupUrl(setupUrl);
        setCopied(false);
        setName('');
        setEmail('');
        setPhone('');
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Unable to create this account');
      }
    });
  }

  return (
    <details className="rounded-2xl border border-stone-200/80 bg-white shadow-xs">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-stone-900"><span className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-brand-primary" /> Create account</span><span className="text-xs font-medium text-stone-500">No password entry or retrieval</span></summary>
      <form onSubmit={submit} className="grid gap-4 border-t border-stone-100 p-5 md:grid-cols-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Account type</span><Combobox options={[{ value: 'STUDENT', label: 'Student', sublabel: 'May be partial' }, { value: 'TUTOR', label: 'Tutor', sublabel: 'Requires complete profile' }]} value={role} onChange={(value) => setRole(value as typeof role)} placeholder="Select account type" searchPlaceholder="Search account types" required /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Name {role === 'STUDENT' && <span className="font-normal text-stone-400">(if known)</span>}</span><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Email {role === 'STUDENT' && <span className="font-normal text-stone-400">(if known)</span>}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Phone {role === 'STUDENT' && <span className="font-normal text-stone-400">(if known)</span>}</span><input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
        <div className="flex items-end md:col-span-4"><Button type="submit" disabled={isPending} isLoading={isPending} className="min-h-[44px]">Create and issue setup link</Button></div>
        {message && setupUrl && <div role="status" className="rounded-lg border border-brand-border bg-brand-subtle px-3 py-2.5 text-sm text-stone-700 md:col-span-4"><p>{message}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><code className="min-h-[44px] min-w-0 flex-1 break-all rounded-lg border border-brand-border/70 bg-white px-3 py-2.5 text-xs text-stone-700">{setupUrl}</code><Button type="button" variant="outline" className="min-h-[44px] shrink-0" onClick={() => { void navigator.clipboard.writeText(setupUrl).then(() => setCopied(true)); }}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? 'Copied' : 'Copy link'}</Button></div></div>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 md:col-span-4">{error}</p>}
      </form>
    </details>
  );
}

const inputClass = 'min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';
