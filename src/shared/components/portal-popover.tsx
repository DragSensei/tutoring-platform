'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useFloatingPanel } from '@/shared/hooks/use-floating-panel';

export type PopoverCloseReason = 'escape' | 'outside';

interface PortalPopoverProps<TTrigger extends HTMLElement> {
  open: boolean;
  triggerRef: React.RefObject<TTrigger>;
  panelRef: React.RefObject<HTMLDivElement>;
  label: string;
  contentKey: string | number;
  minWidth: number;
  onClose: (reason: PopoverCloseReason) => void;
  children: React.ReactNode;
}

export function PortalPopover<TTrigger extends HTMLElement>({
  open,
  triggerRef,
  panelRef,
  label,
  contentKey,
  minWidth,
  onClose,
  children,
}: PortalPopoverProps<TTrigger>) {
  const position = useFloatingPanel(open, triggerRef, panelRef, contentKey, minWidth);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose('escape');
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) onClose('outside');
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose, open, panelRef, triggerRef]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      tabIndex={-1}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: position?.width ?? minWidth,
        maxHeight: position?.maxHeight,
        visibility: position ? 'visible' : 'hidden',
      }}
      className="fixed z-[100] overflow-y-auto rounded-xl border border-border-subtle bg-canvas p-3 shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}
