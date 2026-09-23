'use client';

import * as React from 'react';
import { Clock3 } from 'lucide-react';
import { PortalPopover, type PopoverCloseReason } from '@/shared/components/portal-popover';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  clearable?: boolean;
  disabled?: boolean;
}

function isValidTime(hour: string, minute: string) {
  return /^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute)
    && Number(hour) >= 0 && Number(hour) <= 23
    && Number(minute) >= 0 && Number(minute) <= 59;
}

function padded(value: string) {
  return String(Number(value)).padStart(2, '0');
}

export function TimePicker({ value, onChange, 'aria-label': label, clearable = true, disabled = false }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState('17');
  const [minute, setMinute] = React.useState('00');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const onPopoverClose = React.useCallback((reason: PopoverCloseReason) => close(reason === 'escape'), [close]);

  React.useEffect(() => {
    if (open) hourRef.current?.focus();
  }, [open]);

  function openPicker() {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    setHour(match?.[1] || '17');
    setMinute(match?.[2] || '00');
    setOpen(true);
  }

  function save() {
    if (!isValidTime(hour, minute)) return;
    onChange(`${padded(hour)}:${padded(minute)}`);
    close(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => open ? close() : openPicker()}
        className="inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-left text-sm text-text-primary hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:bg-canvas-subtle disabled:text-text-subtle"
      >
        <span className={value ? '' : 'text-text-subtle'}>{value || 'Choose time'}</span>
        <Clock3 className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
      </button>
      <PortalPopover open={open} triggerRef={triggerRef} panelRef={panelRef} label={`${label} picker`} contentKey="time" minWidth={272} onClose={onPopoverClose}>
        <div className="w-full space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Choose time</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-text-muted">
              Hour <span className="text-text-subtle">(00–23)</span>
              <input
                ref={hourRef}
                type="number"
                min="0"
                max="23"
                step="1"
                inputMode="numeric"
                aria-label="Hour"
                value={hour}
                onChange={(event) => setHour(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save(); } }}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-border-subtle bg-canvas px-3 text-base text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </label>
            <label className="block text-xs font-medium text-text-muted">
              Minute <span className="text-text-subtle">(00–59)</span>
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                inputMode="numeric"
                aria-label="Minute"
                value={minute}
                onChange={(event) => setMinute(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save(); } }}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-border-subtle bg-canvas px-3 text-base text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </label>
          </div>
          <div className="flex justify-between gap-2 border-t border-border-subtle pt-2">
            {clearable && value && <button type="button" onClick={() => { onChange(''); close(true); }} className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-text-muted hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">Clear time</button>}
            <button type="button" disabled={!isValidTime(hour, minute)} onClick={save} className="ml-auto min-h-[44px] rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50">Done</button>
          </div>
        </div>
      </PortalPopover>
    </>
  );
}
