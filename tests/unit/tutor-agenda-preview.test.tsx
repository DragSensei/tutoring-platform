import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SessionSelectionGrid } from '@/app/(portal)/tutor/dashboard/_components/SessionSelectionGrid';
import type { GadwalSessionItem } from '@/features/sessions/types';

describe('Tutor Agenda session preview', () => {
  it('shows a compact upcoming preview with an explicit full timetable link', () => {
    const sessions: GadwalSessionItem[] = Array.from({ length: 5 }, (_, index) => ({
      id: `session-${index + 1}`,
      title: `Robotics Session ${index + 1}`,
      tutorId: 'tutor-1',
      tutorName: 'Tutor',
      sessionType: 'GROUP',
      startTime: `2026-10-0${index + 1}T14:00:00.000Z`,
      endTime: `2026-10-0${index + 1}T16:00:00.000Z`,
      deadline: `2026-10-0${index + 1}T20:00:00.000Z`,
      attendanceClosesAt: `2026-10-0${index + 1}T20:00:00.000Z`,
      token: null,
      status: 'SCHEDULED',
      attendeeCount: 0,
      participantCount: 2,
      attendanceDisposition: 'HAS_ROSTER',
      attendanceWindowState: 'BEFORE',
      price: 375,
      roster: [{ id: `student-${index + 1}`, name: 'Student', email: 'student@example.com', attended: false }],
    }));

    const markup = renderToStaticMarkup(createElement(SessionSelectionGrid, { sessions }));

    expect(markup).toContain('Robotics Session 1');
    expect(markup).toContain('Robotics Session 4');
    expect(markup).not.toContain('Robotics Session 5');
    expect(markup).toContain('View full timetable');
    expect(markup).toContain('href="/tutor/timetable"');
  });
});
