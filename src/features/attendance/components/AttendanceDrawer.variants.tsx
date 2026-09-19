'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Plus,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';

/**
 * Entity schema for Attendance Drawer preview records.
 */
export interface AttendanceDrawerItem {
  id: string;
  title: string;
  subtitle: string;
  status: 'active' | 'completed' | 'pending';
  timestamp: string;
}

/**
 * Fixture records (conforming strictly to UI Architecture Gate 3: <= 3 static items).
 */
export const defaultAttendanceDrawerItems: AttendanceDrawerItem[] = [
  {
    id: 'rec-1',
    title: 'Session Attendance #1',
    subtitle: 'Eng. Omar Ashraf • Robotics Lab 01',
    status: 'completed',
    timestamp: '14:00',
  },
  {
    id: 'rec-2',
    title: 'Session Attendance #2',
    subtitle: 'Eng. Sarah Nabil • Arduino Fundamentals',
    status: 'active',
    timestamp: '15:30',
  },
];

/* =========================================================================
   1. EMPTY / IDLE STATE
   Clean zero-data illustration/icon, contextual prompt, and primary action button.
   ========================================================================= */

export interface AttendanceDrawerEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function AttendanceDrawerEmptyState({
  title = 'No Attendance Drawer Records',
  description = 'No active records or check-ins found. Initialize or mark the first attendee to begin tracking.',
  actionLabel = 'Initialize Record',
  onAction,
  className = '',
}: AttendanceDrawerEmptyStateProps) {
  return (
    <div
      data-testid="attendance-empty-state"
      className={`border border-border-subtle rounded-xl p-8 bg-canvas text-center flex flex-col items-center justify-center min-h-[380px] w-full ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-canvas-subtle border border-border-subtle flex items-center justify-center mb-4 text-brand-primary shadow-tactile">
        <Inbox className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-primary text-white hover:opacity-90 transition-all shadow-tactile focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   2. LOADING SKELETON STATE
   Structural skeleton with matching layout dimensions to eliminate CLS.
   ========================================================================= */

export interface AttendanceDrawerLoadingSkeletonProps {
  className?: string;
}

export function AttendanceDrawerLoadingSkeleton({ className = '' }: AttendanceDrawerLoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading Attendance Drawer"
      data-testid="attendance-loading-skeleton"
      className={`border border-border-subtle rounded-xl p-6 bg-canvas animate-pulse min-h-[380px] flex flex-col justify-between w-full ${className}`}
    >
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-border-subtle/80" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-border-subtle/80 rounded" />
            <div className="h-3 w-24 bg-border-subtle/60 rounded" />
          </div>
        </div>
        <div className="h-6 w-20 bg-border-subtle/60 rounded-full" />
      </div>

      {/* Item Rows Skeleton (eliminates Content Layout Shift) */}
      <div className="space-y-3 py-4 flex-1">
        <div className="h-12 w-full bg-border-subtle/40 rounded-lg border border-border-subtle/30" />
        <div className="h-12 w-full bg-border-subtle/40 rounded-lg border border-border-subtle/30" />
        <div className="h-12 w-full bg-border-subtle/40 rounded-lg border border-border-subtle/30" />
      </div>

      {/* Footer Action Skeleton */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
        <div className="h-3.5 w-28 bg-border-subtle/60 rounded" />
        <div className="h-8 w-32 bg-border-subtle/80 rounded-lg" />
      </div>
      <span className="sr-only">Loading Attendance Drawer...</span>
    </div>
  );
}

/* =========================================================================
   3. ERROR BOUNDARY STATE
   Accessible error banner, retry callback trigger, and error details toggle.
   ========================================================================= */

export interface AttendanceDrawerErrorStateProps {
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export function AttendanceDrawerErrorState({
  error = 'A network or validation error occurred while accessing Attendance Drawer.',
  onRetry,
  className = '',
}: AttendanceDrawerErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error occurred.';
  const errorStack = error instanceof Error ? error.stack : null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="attendance-error-state"
      className={`border border-red-200/80 bg-red-50/40 rounded-xl p-6 text-left min-h-[380px] flex flex-col justify-between w-full ${className}`}
    >
      <div>
        {/* Error Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-600 shadow-tactile">
            <AlertTriangle className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-text-primary">
              Unable to load Attendance Drawer
            </h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>

        {/* Expandable Technical Details Toggle */}
        <div className="mt-4 pt-3 border-t border-red-200/60">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-xs font-medium text-text-muted hover:text-text-primary inline-flex items-center gap-1 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showDetails ? 'Hide technical details' : 'Show technical details'}</span>
          </button>
          {showDetails && (
            <pre className="mt-2 p-3 bg-canvas border border-border-subtle rounded-lg text-[11px] font-mono text-text-muted overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
              {errorStack || errorMessage}
            </pre>
          )}
        </div>
      </div>

      {/* Retry Trigger */}
      {onRetry && (
        <div className="pt-4 border-t border-red-200/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-primary text-white hover:opacity-90 transition-all shadow-tactile focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. POPULATED STATE
   Active component renderer wrapper with fixture data and token purity.
   ========================================================================= */

export interface AttendanceDrawerPopulatedStateProps {
  items?: AttendanceDrawerItem[];
  title?: string;
  onItemSelect?: (item: AttendanceDrawerItem) => void;
  onRefresh?: () => void;
  className?: string;
}

export function AttendanceDrawerPopulatedState({
  items = defaultAttendanceDrawerItems,
  title = 'Attendance Drawer',
  onItemSelect,
  onRefresh,
  className = '',
}: AttendanceDrawerPopulatedStateProps) {
  return (
    <div
      data-testid="attendance-populated-state"
      className={`border border-border-subtle rounded-xl p-6 bg-canvas text-left min-h-[380px] flex flex-col justify-between w-full ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-canvas-subtle border border-border-subtle flex items-center justify-center text-brand-primary shadow-tactile">
              <UserCheck className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-text-muted">
                {items.length} active record{items.length === 1 ? '' : 's'} registered
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-canvas-subtle text-text-primary border border-border-subtle">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        </div>

        {/* Records List */}
        <div className="space-y-2.5 py-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemSelect?.(item)}
              className="group p-3 rounded-lg border border-border-subtle hover:border-text-subtle/50 bg-canvas-subtle/40 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-text-primary group-hover:text-brand-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-[11px] text-text-muted">
                  {item.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.timestamp}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-canvas text-text-primary border border-border-subtle">
                  {item.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Token-pure Claude semantic layout
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-canvas text-text-primary border border-border-subtle hover:bg-canvas-subtle transition-all shadow-tactile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   5. STATE MACHINE COMPANION ORCHESTRATOR
   Allows switching between variants or previewing all 4 states concurrently.
   ========================================================================= */

export type AttendanceDrawerVariantState = 'empty' | 'loading' | 'error' | 'populated' | 'all';

export interface AttendanceDrawerVariantsProps {
  variant?: AttendanceDrawerVariantState;
  onAction?: () => void;
  onRetry?: () => void;
  error?: Error | string | null;
  items?: AttendanceDrawerItem[];
  className?: string;
}

export function AttendanceDrawerVariants({
  variant = 'populated',
  onAction,
  onRetry,
  error,
  items,
  className = '',
}: AttendanceDrawerVariantsProps) {
  const [activeState, setActiveState] = useState<AttendanceDrawerVariantState>(variant);

  if (activeState === 'empty') {
    return <AttendanceDrawerEmptyState onAction={onAction} className={className} />;
  }

  if (activeState === 'loading') {
    return <AttendanceDrawerLoadingSkeleton className={className} />;
  }

  if (activeState === 'error') {
    return <AttendanceDrawerErrorState error={error} onRetry={onRetry} className={className} />;
  }

  if (activeState === 'populated') {
    return <AttendanceDrawerPopulatedState items={items} className={className} />;
  }

  // 'all' Preview mode: composite layout showing all 4 states for testing / audits
  return (
    <div className={`space-y-6 ${className}`} data-testid="attendance-variants-matrix">
      {/* Switcher Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-canvas-subtle rounded-lg border border-border-subtle w-fit text-xs">
        {(['populated', 'loading', 'empty', 'error', 'all'] as AttendanceDrawerVariantState[]).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setActiveState(st)}
            className={`px-2.5 py-1 rounded-md font-medium transition-all capitalize ${
              activeState === st
                ? 'bg-canvas text-text-primary shadow-tactile border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Grid of All 4 States */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">1. Populated State</span>
          <AttendanceDrawerPopulatedState items={items} />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">2. Loading Skeleton</span>
          <AttendanceDrawerLoadingSkeleton />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">3. Empty State</span>
          <AttendanceDrawerEmptyState onAction={onAction} />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">4. Error Boundary</span>
          <AttendanceDrawerErrorState error={error} onRetry={onRetry} />
        </div>
      </div>
    </div>
  );
}

export default AttendanceDrawerVariants;
