'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeAccountSetup } from '../actions';
import { getRoleRedirectPath } from '@/features/auth/role-redirect';

const inputClass = 'min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

export function AccountSetupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [isPending, startTransition] = React.useTransition();
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await completeAccountSetup({ token, password, name, email, phone });
        if (!result.profileComplete) {
          setError('Your password is set, but the profile is still incomplete. Ask an Admin for a new setup link after the missing details are known.');
          return;
        }
        router.replace(getRoleRedirectPath(result.role));
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to complete account setup');
      }
    });
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4 py-8">
      <section className="w-full max-w-lg space-y-6">
        <header><p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Big Hero Robotics Academy</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">Finish account setup</h1><p className="mt-1 text-sm text-stone-500">Create your password and confirm the profile details required for portal access.</p></header>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:p-7">
          <Field label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} /></Field>
          <Field label="Phone"><input value={phone} onChange={(event) => setPhone(event.target.value)} required className={inputClass} /></Field>
          <Field label="New password"><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required className={inputClass} /></Field>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={isPending || !token} className="min-h-[44px] w-full rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{isPending ? 'Saving setup…' : 'Complete setup'}</button>
        </form>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">{label}</span>{children}</label>;
}
