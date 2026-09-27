import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminNeedsAttentionView } from '@/app/(portal)/admin/needs-attention/_components/admin-needs-attention-view';
import type { AdminAttendanceInterventionBoard } from '@/features/attendance/server/admin-attendance';

describe('Admin attendance attention categories', () => {
  it('renders exactly the three counted categories', () => {
    const board: AdminAttendanceInterventionBoard = {
      attention: [],
      needsAction: [],
      recoveryActive: [],
      handled: [],
      otherAttention: [],
    };
    const markup = renderToStaticMarkup(createElement(AdminNeedsAttentionView, { board, asOf: '2026-10-01T14:00:00.000Z' }));

    expect((markup.match(/role="tab"/g) ?? [])).toHaveLength(3);
    expect(markup).toContain('Needs Action');
    expect(markup).toContain('Recovery Active');
    expect(markup).toContain('Handled — Last 30 Days');
    expect(markup).not.toContain('Other attention');
  });
});
