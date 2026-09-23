import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GadwalSessionItem } from '@/features/sessions/types';
import { TutorHistoryView } from '@/app/(portal)/tutor/history/_components/tutor-history-view';

describe('Tutor history display for pre-system schedules', () => {
  it('labels historical rows, shows the scheduled roster, and hides attendance actions', () => {
    const session: GadwalSessionItem = {
      id: 'historical-1',
      title: 'Robotics Club',
      tutorId: 'tutor-1',
      tutorName: 'Tutor One',
      sessionType: 'GROUP',
      startTime: '2026-08-10T14:00:00.000Z',
      endTime: '2026-08-10T15:30:00.000Z',
      deadline: '2026-08-10T19:30:00.000Z',
      token: null,
      status: 'SCHEDULED',
      historicalOnly: true,
      attendeeCount: 0,
      participantCount: 1,
      price: 0,
      assignedStudents: ['Student One'],
      roster: [{ id: 'student-1', name: 'Student One', email: 'student@example.com', attended: false }],
    };
    const html = renderToString(<TutorHistoryView tutor={{ id: 'tutor-1', name: 'Tutor One' }} sessions={[session]} closestSession={null} />);

    expect(html).toContain('Pre-system schedule');
    expect(html).toContain('Scheduled students:');
    expect(html).toContain('Student One');
    expect(html).not.toContain('Edit Attendance');
    expect(html).not.toContain('Attended (');
  });
});
