import { describe, it, expect } from 'vitest';
import { findClosestSessionDue, computeDueCountdown } from '@/app/(portal)/tutor/dashboard/_components/dashboard-data';
import type { GadwalSessionItem } from '@/features/sessions/types';

describe('Tutor Dashboard Closest Session Due Calculation', () => {
  const baseSession: GadwalSessionItem = {
    id: 's-1',
    title: 'Electronics Level 1: Arduino Fundamentals',
    tutorId: 'tutor-1',
    tutorName: 'Eng. Omar Ashraf',
    sessionType: 'GROUP',
    startTime: '2026-09-17T14:00:00.000Z',
    endTime: '2026-09-17T16:00:00.000Z',
    deadline: '2026-09-17T18:00:00.000Z',
    token: 'test-token-uuid-1',
    status: 'SCHEDULED',
    attendeeCount: 4,
    price: 375,
  };

  it('identifies the closest upcoming session when multiple sessions are scheduled', () => {
    const sessionFar: GadwalSessionItem = {
      ...baseSession,
      id: 's-far',
      title: 'PictoBlox Robotics',
      startTime: '2026-09-19T10:00:00.000Z',
      deadline: '2026-09-19T14:00:00.000Z',
    };

    const sessionClose: GadwalSessionItem = {
      ...baseSession,
      id: 's-close',
      title: 'Sumo Robotics Workshop',
      startTime: '2026-09-17T15:00:00.000Z',
      deadline: '2026-09-17T19:00:00.000Z',
    };

    const now = new Date('2026-09-17T12:00:00.000Z');
    const closest = findClosestSessionDue([sessionFar, sessionClose], now);

    expect(closest).not.toBeNull();
    expect(closest?.id).toBe('s-close');
    expect(closest?.isCurrentlyActive).toBe(false);
  });

  it('marks an in-progress session as active when current time is between start and deadline', () => {
    const sessionActive: GadwalSessionItem = {
      ...baseSession,
      id: 's-active',
      startTime: '2026-09-17T10:00:00.000Z',
      deadline: '2026-09-17T14:00:00.000Z',
    };

    // Current time is 11:30 (during active 4h window)
    const now = new Date('2026-09-17T11:30:00.000Z');
    const closest = findClosestSessionDue([sessionActive], now);

    expect(closest).not.toBeNull();
    expect(closest?.id).toBe('s-active');
    expect(closest?.isCurrentlyActive).toBe(true);
  });

  it('computes countdown accurately for future session start', () => {
    const target = new Date('2026-09-17T14:00:00.000Z');
    // Exactly 2 hours, 15 minutes, 30 seconds before
    const now = new Date(target.getTime() - (2 * 3600 + 15 * 60 + 30) * 1000);

    const countdown = computeDueCountdown(target, now);
    expect(countdown.isPast).toBe(false);
    expect(countdown.hours).toBe(2);
    expect(countdown.minutes).toBe(15);
    expect(countdown.seconds).toBe(30);
    expect(countdown.formatted).toBe('02:15:30');
  });

  it('returns null gracefully when no sessions exist or all are expired', () => {
    const expiredSession: GadwalSessionItem = {
      ...baseSession,
      startTime: '2026-09-10T10:00:00.000Z',
      deadline: '2026-09-10T14:00:00.000Z',
    };

    const now = new Date('2026-09-17T12:00:00.000Z');
    const closest = findClosestSessionDue([expiredSession], now);
    expect(closest).toBeNull();
  });

  it('propagates sessionCode and assignedStudents when present', () => {
    const sessionWithDetails: GadwalSessionItem = {
      ...baseSession,
      id: 's-details',
      sessionCode: 'ON-P3-6:00-8:00',
      assignedStudents: ['Karim Mostafa', 'Salma Hossam'],
      startTime: '2026-09-17T15:00:00.000Z',
      deadline: '2026-09-17T19:00:00.000Z',
    };

    const now = new Date('2026-09-17T12:00:00.000Z');
    const closest = findClosestSessionDue([sessionWithDetails], now);

    expect(closest?.sessionCode).toBe('ON-P3-6:00-8:00');
    expect(closest?.assignedStudents).toEqual(['Karim Mostafa', 'Salma Hossam']);
  });
});
