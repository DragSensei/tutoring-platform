'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { beginDestructiveHold, canConfirmDestructiveDelete, canStartDestructiveHold, EMPTY_DESTRUCTIVE_HOLD, finishDestructiveHold, resetDestructiveHold, type DestructiveHoldState } from '@/features/accounts/domain/destructive-hold';
import { getAdminAccountDeletionImpact, permanentlyDeleteAdminAccount, setAdminAccountActive } from '../../actions';

type Impact = Awaited<ReturnType<typeof getAdminAccountDeletionImpact>>;
const DEPENDENCY_LABELS: Record<string, string> = {
  tutored_sessions: 'Tutor session assignments', tutored_series: 'Tutor recurring schedules', attendances: 'Attendance history',
  session_participants: 'Session participation history', series_participants: 'Recurring roster memberships', setup_tokens: 'Account setup and reset links',
  created_transactions: 'Wallet actions created', created_student_imports: 'Student imports created', imported_student_rows: 'Import history references',
  tutor_compensation_entries: 'Tutor compensation history', commission_entries: 'Sales commission history', commission_policy_updates: 'Finance policy audit history',
  tutor_payouts: 'Tutor payout settlements', created_payouts: 'Payouts created by this account',
};

export function AccountLifecycleControls({ userId, status, role }: { userId: string; status: string; role: 'TUTOR' | 'STUDENT' }) {
  const router = useRouter();
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [impact, setImpact] = React.useState<Impact | null>(null);
  const [phrase, setPhrase] = React.useState('');
  const [held, setHeld] = React.useState(false);
  const [holdComplete, setHoldComplete] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdState = React.useRef<DestructiveHoldState>(EMPTY_DESTRUCTIVE_HOLD);
  const holdGeneration = React.useRef(0);
  const deleteOpenRef = React.useRef(deleteOpen);
  deleteOpenRef.current = deleteOpen;
  const previousFocus = React.useRef<HTMLElement | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const pendingRef = React.useRef(pending);
  pendingRef.current = pending;
  const deactivated = status === 'DEACTIVATED';

  const resetHold = React.useCallback(() => {
    holdGeneration.current += 1;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdState.current = resetDestructiveHold();
    setHeld(false);
    setHoldComplete(false);
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    resetHold();
    setPhrase('');
    setDeleteOpen(false);
  }, [resetHold]);

  React.useEffect(() => {
    if (!deleteOpen) return;
    resetHold();
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    setImpact(null); setError('');
    void getAdminAccountDeletionImpact(userId).then(setImpact).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load account dependencies.'));
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pendingRef.current) { event.preventDefault(); closeDeleteDialog(); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-account-delete-dialog] button:not(:disabled), [data-account-delete-dialog] input:not(:disabled)'));
      const first = controls[0], last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = null;
      holdGeneration.current += 1;
      holdState.current = resetDestructiveHold();
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [deleteOpen, userId, resetHold, closeDeleteDialog]);

  function startHold() {
    if (!deleteOpenRef.current || !impact?.canDelete || pending || !canStartDestructiveHold(holdState.current)) return;
    holdState.current = beginDestructiveHold(Date.now());
    const generation = ++holdGeneration.current;
    setHeld(true);
    holdTimer.current = setTimeout(() => {
      if (!deleteOpenRef.current || holdGeneration.current !== generation) return;
      holdTimer.current = null;
      holdState.current = finishDestructiveHold(holdState.current, Date.now());
      setHeld(false);
      setHoldComplete(holdState.current.complete);
    }, 4000);
  }
  function endHold() {
    if (holdState.current.startedAt === null) return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdGeneration.current += 1;
    holdState.current = finishDestructiveHold(holdState.current, Date.now());
    setHeld(false);
    setHoldComplete(holdState.current.complete);
  }
  async function deactivate() {
    setPending(true); setError('');
    try { await setAdminAccountActive(userId, deactivated); setDeactivateOpen(false); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this account.'); }
    finally { setPending(false); }
  }
  async function removePermanently() {
    setPending(true); setError('');
    try { await permanentlyDeleteAdminAccount(userId, phrase); router.push('/admin/accounts'); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete this account.'); }
    finally { setPending(false); }
  }

  return <>
    <section className="rounded-2xl border border-border-subtle bg-canvas p-5">
      <h2 className="font-semibold text-text-primary">Account access</h2>
      <p className="mt-1 text-sm text-text-muted">{deactivated ? 'This account cannot sign in. Its historical records are preserved.' : role === 'TUTOR' ? 'Deactivation disables sign-in. Future sessions and active recurring schedules must be reassigned before this Tutor can be deactivated.' : 'Deactivation disables sign-in and removes eligible future Student participation.'}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => { setError(''); setDeactivateOpen(true); }} className="min-h-[44px] rounded-lg border border-border-strong px-4 text-sm font-semibold text-text-primary">{deactivated ? 'Reactivate account' : 'Deactivate account'}</button>
        {deactivated && <button type="button" onClick={() => { resetHold(); setPhrase(''); setDeleteOpen(true); }} className="min-h-[44px] rounded-lg border border-rose-300 px-4 text-sm font-semibold text-rose-800">Review permanent deletion</button>}
      </div>
    </section>
    <ConfirmDialog open={deactivateOpen} title={deactivated ? 'Reactivate account?' : 'Deactivate account?'} description={deactivated ? 'This restores sign-in access. Historical records remain unchanged.' : role === 'TUTOR' ? 'This disables sign-in. Historical records remain unchanged. Reassign future sessions and active recurring schedules before deactivating this Tutor.' : 'This disables sign-in. Historical attendance and finance remain unchanged. Future Student participation is removed only when the remaining roster stays valid.'} confirmLabel={deactivated ? 'Reactivate' : 'Deactivate account'} cancelLabel="Cancel" pending={pending} error={error} onCancel={() => setDeactivateOpen(false)} onConfirm={() => { void deactivate(); }} />
    {deleteOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-text-primary/40 p-4"><section data-account-delete-dialog role="alertdialog" aria-modal="true" aria-labelledby="account-delete-title" className="my-auto w-full max-w-xl rounded-2xl border border-border-subtle bg-canvas p-5 shadow-xl sm:p-7">
      <h2 id="account-delete-title" className="text-lg font-bold text-text-primary">Permanently delete account</h2>
      <p className="mt-2 text-sm text-text-muted">This exceptional action cannot be undone. Deletion is available only when no historical or financial records depend on this account.</p>
      <h3 className="mt-5 text-sm font-semibold text-text-primary">Dependency impact</h3>
      {!impact && !error && <p className="mt-2 text-sm text-text-muted">Checking related records…</p>}
      {impact && (impact.dependencies.length ? <ul className="mt-2 space-y-1 text-sm text-text-muted">{impact.dependencies.map((entry) => <li key={entry.category}>{DEPENDENCY_LABELS[entry.category] ?? entry.category}: {entry.count}{entry.detail ? ` · ${entry.detail}` : ''} · preserved; deletion blocked</li>)}</ul> : <p className="mt-2 text-sm text-text-muted">No related records found. Account must remain deactivated until deletion.</p>)}
      <button type="button" disabled={!impact?.canDelete || pending || holdComplete} onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold} onKeyDown={(event) => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); startHold(); } }} onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); endHold(); } }} onClick={(event) => event.preventDefault()} aria-describedby="delete-hold-help" className="relative mt-5 min-h-[48px] w-full overflow-hidden rounded-lg border border-rose-700 bg-canvas text-sm font-bold text-rose-900 disabled:opacity-50"><span className="absolute inset-y-0 left-0 origin-left bg-rose-200 transition-transform duration-[4000ms] ease-linear" style={{ transform: `scaleX(${held ? 1 : 0})` }} /><span className="relative">{holdComplete ? 'Hold complete' : held ? 'Keep holding for 4 seconds…' : 'Press and hold for 4 seconds to continue'}</span></button>
      <p id="delete-hold-help" className="mt-1 text-xs text-text-muted">Hold with pointer, or focus and hold Space or Enter. Releasing early resets the hold.</p>
      {holdComplete && <label className="mt-4 block text-sm font-semibold text-text-primary">Type <code>delete-this-account</code> to confirm<input value={phrase} onChange={(event) => setPhrase(event.target.value)} autoComplete="off" className="mt-2 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 font-normal" /></label>}
      {error && <p role="alert" className="mt-3 text-sm text-brand-primary">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancelRef} type="button" disabled={pending} onClick={closeDeleteDialog} className="min-h-[44px] rounded-lg border border-border-strong px-4 text-sm font-semibold">Cancel</button><button type="button" disabled={pending || !canConfirmDestructiveDelete(Boolean(impact?.canDelete), holdComplete, phrase)} onClick={() => { void removePermanently(); }} className="min-h-[44px] rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Deleting…' : 'Permanently delete'}</button></div>
    </section></div>}
  </>;
}
