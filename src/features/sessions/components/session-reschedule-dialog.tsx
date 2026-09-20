'use client';

import * as React from 'react';
import { Dialog } from '@/shared/components/dialog';
import { Button } from '@/shared/components/button';
import type { WeeklyScheduleSession, LocalScheduleException } from './weekly-session-schedule';

interface SessionRescheduleDialogProps {
  session: WeeklyScheduleSession | null;
  existingException?: LocalScheduleException;
  onClose: () => void;
  onSave: (sessionId: string, exception: LocalScheduleException) => void;
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function SessionRescheduleDialog({ session, existingException, onClose, onSave }: SessionRescheduleDialogProps) {
  const [dateTime, setDateTime] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session) return;
    setDateTime(toLocalInputValue(existingException?.effectiveStartTime || session.startTime));
    setReason(existingException?.reason || '');
    setError(null);
  }, [existingException, session]);

  if (!session) return null;

  return (
    <Dialog
      isOpen={Boolean(session)}
      onClose={onClose}
      title="Postpone one occurrence"
      description="This changes only this browser's preview of this week's occurrence. The recurring schedule is unchanged."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
          <span className="font-medium text-stone-900">Recurring schedule:</span> {session.title}
        </div>
        <div>
          <label htmlFor="reschedule-time" className="text-sm font-medium text-stone-800">New date and time</label>
          <input id="reschedule-time" type="datetime-local" value={dateTime} onChange={(event) => setDateTime(event.target.value)} className="mt-1.5 min-h-[44px] w-full rounded-lg border border-stone-300 px-3 text-sm text-stone-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
        </div>
        <div>
          <label htmlFor="reschedule-reason" className="text-sm font-medium text-stone-800">Reason / excuse</label>
          <textarea id="reschedule-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="e.g. Tutor unavailable" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
        </div>
        {error && <p role="alert" className="text-sm font-medium text-brand-primary">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => {
            if (!dateTime || reason.trim().length < 3) {
              setError('Choose a new date and time and provide a short reason.');
              return;
            }
            onSave(session.id, { effectiveStartTime: new Date(dateTime).toISOString(), reason: reason.trim() });
            onClose();
          }}>Save local exception</Button>
        </div>
      </div>
    </Dialog>
  );
}
