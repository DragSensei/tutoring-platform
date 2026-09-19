import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  AttendanceDrawerVariants,
  AttendanceDrawerEmptyState,
  AttendanceDrawerLoadingSkeleton,
  AttendanceDrawerErrorState,
  AttendanceDrawerPopulatedState,
} from '@/features/attendance/components/AttendanceDrawer.variants';

describe('AttendanceDrawer 4-State Machine Variants', () => {
  it('mounts and renders Empty / Idle state without throwing', () => {
    expect(() => {
      const html = renderToString(
        <AttendanceDrawerEmptyState
          title="No Attendance Drawer Records"
          actionLabel="Add Record"
          onAction={vi.fn()}
        />
      );
      expect(html).toBeTruthy();
      expect(html).toContain('No Attendance Drawer Records');
      expect(html).toContain('Add Record');
      expect(html).toContain('border-border-subtle');
    }).not.toThrow();
  });

  it('mounts and renders Loading Skeleton state with matching dimensions to eliminate CLS', () => {
    expect(() => {
      const html = renderToString(<AttendanceDrawerLoadingSkeleton />);
      expect(html).toBeTruthy();
      expect(html).toContain('role="status"');
      expect(html).toContain('animate-pulse');
      expect(html).toContain('min-h-[380px]');
    }).not.toThrow();
  });

  it('mounts and renders Error Boundary state with accessible alert banner and retry trigger', () => {
    expect(() => {
      const testError = 'Connection failed: 503 Service Unavailable';
      const html = renderToString(
        <AttendanceDrawerErrorState
          error={testError}
          onRetry={vi.fn()}
        />
      );
      expect(html).toBeTruthy();
      expect(html).toContain('role="alert"');
      expect(html).toContain(testError);
      expect(html).toContain('Retry Connection');
    }).not.toThrow();
  });

  it('mounts and renders Populated state active renderer wrapper with token purity', () => {
    expect(() => {
      const html = renderToString(<AttendanceDrawerPopulatedState />);
      expect(html).toBeTruthy();
      expect(html).toContain('Attendance Drawer');
      expect(html).toContain('text-text-primary');
      expect(html).toContain('border-border-subtle');
    }).not.toThrow();
  });

  it('mounts and renders Variants orchestrator switcher for all 5 mode variations', () => {
    const modes = ['empty', 'loading', 'error', 'populated', 'all'] as const;
    for (const mode of modes) {
      expect(() => {
        const html = renderToString(
          <AttendanceDrawerVariants variant={mode} onAction={vi.fn()} onRetry={vi.fn()} />
        );
        expect(html).toBeTruthy();
        expect(typeof html).toBe('string');
      }).not.toThrow();
    }
  });
});
