'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { completePasswordReset } from '../actions';

const inputClass = 'min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20';

export function PasswordResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [complete, setComplete] = React.useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await completePasswordReset({ token, password });
        setComplete(true);
        setPassword('');
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to reset your password');
      }
    });
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4 py-8">
      <section className="w-full max-w-lg space-y-6">
        <header><p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Big Hero Robotics Academy</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">Reset your password</h1><p className="mt-1 text-sm text-stone-500">Choose a new password. Your profile, role, and account status stay unchanged.</p></header>
        {complete ? (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xs sm:p-7"><p className="text-sm font-medium text-emerald-800">Your password was updated. Sign in with the new password to enter your portal.</p><Link href="/login" className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Continue to sign in</Link></div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs sm:p-7"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">New password</span><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!token} className={inputClass} /></label>{error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}<button type="submit" disabled={isPending || !token} className="min-h-[44px] w-full rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{isPending ? 'Saving password…' : 'Save new password'}</button></form>
        )}
      </section>
    </main>
  );
}
