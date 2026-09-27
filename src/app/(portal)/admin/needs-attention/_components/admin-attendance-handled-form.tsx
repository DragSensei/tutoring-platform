'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/button';
import { markSessionHandled } from '../actions';

export function AdminAttendanceHandledForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [note, setNote] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function markHandled() {
    if (note.trim().length < 8) {
      setMessage('Add a note of at least 8 characters describing how this Session was handled.');
      return;
    }
    startTransition(async () => {
      const result = await markSessionHandled(sessionId, note);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setNote('');
      setMessage('Session marked handled. It cannot receive another recovery window.');
      router.refresh();
    });
  }

  return (
    <details className="w-full min-w-0 rounded-xl border border-border-subtle bg-white p-3 sm:max-w-xl">
      <summary className="min-h-[44px] cursor-pointer content-center text-sm font-semibold text-text-primary">Mark handled without opening a recovery window</summary>
      <div className="mt-3 space-y-3">
        <label htmlFor={`admin-handled-note-${sessionId}`} className="block text-sm font-medium text-text-primary">How was the attendance issue resolved?</label>
        <textarea id={`admin-handled-note-${sessionId}`} value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={1000} className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
        <Button type="button" className="min-h-[44px]" disabled={isPending} isLoading={isPending} onClick={markHandled}>Mark Session handled</Button>
        {message && <p role="status" className="text-sm text-text-primary">{message}</p>}
      </div>
    </details>
  );
}
