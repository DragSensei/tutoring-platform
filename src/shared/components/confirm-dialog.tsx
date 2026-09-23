'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, pending = false, error, onCancel, onConfirm }: ConfirmDialogProps) {
  const id = React.useId();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const cancelHandlerRef = React.useRef(onCancel);
  const pendingRef = React.useRef(pending);
  cancelHandlerRef.current = onCancel;
  pendingRef.current = pending;

  React.useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pendingRef.current) {
        event.preventDefault();
        cancelHandlerRef.current();
      }
      if (event.key === 'Tab') {
        if (pendingRef.current) {
          event.preventDefault();
          dialogRef.current?.focus();
          return;
        }
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-text-primary/40 p-4" onClick={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
      <section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={pending} className="w-full max-w-md rounded-2xl border border-border-subtle bg-canvas p-6 shadow-xl">
        <h2 id={`${id}-title`} className="text-lg font-bold text-text-primary">{title}</h2>
        <p id={`${id}-description`} className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
        {error && <p role="alert" className="mt-3 rounded-lg border border-brand-border bg-brand-subtle px-3 py-2 text-sm text-brand-primary">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" disabled={pending} onClick={onCancel} className="min-h-[44px] rounded-lg border border-border-strong px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle disabled:opacity-60">{cancelLabel}</button>
          <button ref={confirmRef} type="button" disabled={pending} onClick={onConfirm} className="min-h-[44px] rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{pending ? 'Working…' : confirmLabel}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
