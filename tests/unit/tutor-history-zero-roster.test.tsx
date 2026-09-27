import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TutorHistoryView } from '@/app/(portal)/tutor/history/_components/tutor-history-view';
import type { GadwalSessionItem } from '@/features/sessions/types';

describe('Tutor History zero-roster actions', () => {
  it('keeps legacy history visible to Tutor without an Edit Attendance action', () => {
    const session: GadwalSessionItem = {
      id: 'legacy-session',
      title: 'Legacy Session',
      tutorId: 'tutor-1',
      tutorName: 'Tutor',
      sessionType: 'GROUP',
      startTime: '2026-09-20T14:00:00.000Z',
      endTime: '2026-09-20T16:00:00.000Z',
      deadline: '2026-09-20T20:00:00.000Z',
      token: null,
      status: 'COMPLETED',
      attendeeCount: 1,
      participantCount: 0,
      attendanceDisposition: 'ADMIN_REVIEW',
      attendanceNotes: null,
      assignedStudents: [],
      roster: [],
      price: 375,
    };
    const markup = renderToStaticMarkup(createElement(TutorHistoryView, {
      tutor: { id: 'tutor-1', name: 'Tutor' },
      closestSession: null,
      sessions: [session],
    }));

    expect(markup).toContain('Legacy Session');
    expect(markup).toContain('Admin data review · no Tutor action');
    expect(markup).not.toContain('Edit Attendance');
    expect(markup).not.toContain('href="/tutor/attendance/legacy-session"');
  });
});
