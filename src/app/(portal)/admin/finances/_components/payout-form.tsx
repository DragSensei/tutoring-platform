'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { recordPayout, type PayoutActionState } from '@/features/finances/server/payout-actions';

type Option = { value: string; label: string };

export function PayoutForm({ options, initialKey }: { options: Option[]; initialKey: string }) {
  const initial: PayoutActionState = { message: null, key: initialKey };
  const [state, action] = useFormState(recordPayout, initial);
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="idempotencyKey" value={state.key} />
      <label className="flex min-h-[44px] flex-col gap-1 text-xs font-semibold text-text-primary sm:col-span-2">Recipient<select name="recipientChoice" required defaultValue="" className="min-h-[44px] rounded-lg border border-border-strong bg-canvas px-3 text-sm"><option value="">Choose a recipient</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="flex min-h-[44px] flex-col gap-1 text-xs font-semibold text-text-primary">Amount (EGP)<input name="amount" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" className="min-h-[44px] rounded-lg border border-border-strong bg-canvas px-3 text-sm" /></label>
      <label className="flex min-h-[44px] flex-col gap-1 text-xs font-semibold text-text-primary">Note or reference<input name="note" maxLength={500} className="min-h-[44px] rounded-lg border border-border-strong bg-canvas px-3 text-sm" /></label>
      <SubmitButton />
      <p role="status" aria-live="polite" className="text-sm text-text-muted sm:col-span-2 xl:col-span-4">{state.message ?? 'A payout is a permanent record. Amounts above lifetime outstanding are rejected.'}</p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-[44px] self-end rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-brand-subtle hover:bg-brand-hover disabled:opacity-60">{pending ? 'Recording…' : 'Record payout'}</button>;
}
