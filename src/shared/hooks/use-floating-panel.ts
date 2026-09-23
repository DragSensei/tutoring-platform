import * as React from 'react';

export interface FloatingPanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const VIEWPORT_MARGIN = 8;
const PANEL_GAP = 6;
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function useFloatingPanel<TTrigger extends HTMLElement, TPanel extends HTMLElement>(
  isOpen: boolean,
  triggerRef: React.RefObject<TTrigger>,
  panelRef: React.RefObject<TPanel>,
  contentKey: string | number,
  minWidth = 0,
) {
  const [position, setPosition] = React.useState<FloatingPanelPosition | null>(null);

  const updatePosition = React.useCallback(() => {
    if (!isOpen || !triggerRef.current || typeof window === 'undefined') {
      setPosition(null);
      return;
    }

    const trigger = triggerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(window.innerWidth - VIEWPORT_MARGIN * 2, 0);
    const width = Math.min(Math.max(trigger.width, minWidth), availableWidth);
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(trigger.left, VIEWPORT_MARGIN), maxLeft);
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
    const belowTop = trigger.bottom + PANEL_GAP;
    const canFitBelow = panelHeight === 0 || belowTop + panelHeight <= window.innerHeight - VIEWPORT_MARGIN;
    const canFitAbove = panelHeight > 0 && trigger.top - PANEL_GAP - panelHeight >= VIEWPORT_MARGIN;
    const top = canFitBelow
      ? belowTop
      : canFitAbove
        ? trigger.top - PANEL_GAP - panelHeight
        : Math.max(VIEWPORT_MARGIN, Math.min(belowTop, window.innerHeight - VIEWPORT_MARGIN - panelHeight));

    setPosition({
      top,
      left,
      width,
      maxHeight: Math.max(window.innerHeight - top - VIEWPORT_MARGIN, 1),
    });
  }, [isOpen, minWidth, panelRef, triggerRef]);

  useIsomorphicLayoutEffect(() => {
    updatePosition();
  }, [contentKey, updatePosition]);

  React.useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (observer && panelRef.current) observer.observe(panelRef.current);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      observer?.disconnect();
    };
  }, [isOpen, panelRef, updatePosition]);

  return position;
}
