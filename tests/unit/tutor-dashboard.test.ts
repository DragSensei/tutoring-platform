import { describe, it, expect } from 'vitest';
import { findClosestSessionDue } from '@/app/(portal)/tutor/dashboard/_components/timer-utils';
import {
  computeSessionCountdown,
  getSessionTimingTarget,
  resolveEffectiveSessionTiming,
} from '@/shared/utils/session-timing';
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
      endTime: '2026-09-19T12:00:00.000Z',
      deadline: '2026-09-19T14:00:00.000Z',
    };

    const sessionClose: GadwalSessionItem = {
      ...baseSession,
      id: 's-close',
      title: 'Sumo Robotics Workshop',
      startTime: '2026-09-17T15:00:00.000Z',
      endTime: '2026-09-17T17:00:00.000Z',
      deadline: '2026-09-17T19:00:00.000Z',
    };

    const now = new Date('2026-09-17T12:00:00.000Z');
    const closest = findClosestSessionDue([sessionFar, sessionClose], now);

    expect(closest).not.toBeNull();
    expect(closest?.id).toBe('s-close');
    expect(closest?.isCurrentlyActive).toBe(false);
  });

  it('marks an in-progress session as active when current time is between start and end', () => {
    const sessionActive: GadwalSessionItem = {
      ...baseSession,
      id: 's-active',
      startTime: '2026-09-17T10:00:00.000Z',
      endTime: '2026-09-17T12:00:00.000Z',
      deadline: '2026-09-17T14:00:00.000Z',
    };

    // Current time is 11:30 (during the actual session, regardless of its attendance deadline)
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

    const countdown = computeSessionCountdown(target, now);
    expect(countdown.isPast).toBe(false);
    expect(countdown.days).toBe(0);
    expect(countdown.hours).toBe(2);
    expect(countdown.minutes).toBe(15);
    expect(countdown.seconds).toBe(30);
    expect(countdown.formatted).toBe('00:02:15:30');
  });

  it('normalizes countdown units into days, 24-hour hours, minutes, and seconds', () => {
    const now = new Date('2026-09-17T12:00:00.000Z');
    const hours = 3_600_000;

    expect(computeSessionCountdown(new Date(now.getTime() + 141 * hours), now)).toMatchObject({
      days: 5,
      hours: 21,
      minutes: 0,
      seconds: 0,
      formatted: '05:21:00:00',
    });
    expect(computeSessionCountdown(new Date(now.getTime() + 25 * hours + 3 * 60_000 + 2_000), now)).toMatchObject({
      days: 1,
      hours: 1,
      minutes: 3,
      seconds: 2,
      formatted: '01:01:03:02',
    });
    expect(computeSessionCountdown(new Date(now.getTime() + 23 * hours), now)).toMatchObject({
      days: 0,
      hours: 23,
      minutes: 0,
      seconds: 0,
      formatted: '00:23:00:00',
    });
  });

  it('returns a four-unit zero countdown after the target has passed', () => {
    const countdown = computeSessionCountdown('2026-09-17T12:00:00.000Z', '2026-09-17T12:00:01.000Z');

    expect(countdown).toEqual({
      isPast: true,
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00:00:00:00',
    });
  });

  it('returns null gracefully when no sessions exist or all are expired', () => {
    const expiredSession: GadwalSessionItem = {
      ...baseSession,
      startTime: '2026-09-10T10:00:00.000Z',
      endTime: '2026-09-10T12:00:00.000Z',
      deadline: '2026-09-10T14:00:00.000Z',
    };

    const now = new Date('2026-09-17T12:00:00.000Z');
    const closest = findClosestSessionDue([expiredSession], now);
    expect(closest).toBeNull();
  });

  it('advances at the concrete end time and ignores completed or cancelled rows', () => {
    const ended = {
      ...baseSession,
      id: 's-ended',
      startTime: '2026-09-17T10:00:00.000Z',
      endTime: '2026-09-17T12:00:00.000Z',
      status: 'SCHEDULED' as const,
    };
    const next = {
      ...baseSession,
      id: 's-next',
      startTime: '2026-09-17T14:00:00.000Z',
      endTime: '2026-09-17T16:00:00.000Z',
      status: 'SCHEDULED' as const,
    };
    const completed = { ...next, id: 's-completed', status: 'COMPLETED' as const, startTime: '2026-09-17T13:00:00.000Z', endTime: '2026-09-17T13:30:00.000Z' };
    const cancelled = { ...next, id: 's-cancelled', status: 'CANCELLED' as const, startTime: '2026-09-17T13:30:00.000Z', endTime: '2026-09-17T14:00:00.000Z' };

    const closest = findClosestSessionDue([ended, completed, cancelled, next], new Date('2026-09-17T12:00:00.000Z'));

    expect(closest?.id).toBe('s-next');
    expect(closest?.isCurrentlyActive).toBe(false);
  });

  it('propagates sessionCode and assignedStudents when present', () => {
    const sessionWithDetails: GadwalSessionItem = {
      ...baseSession,
      id: 's-details',
      sessionCode: 'ON-P3-6:00-8:00',
      assignedStudents: ['Karim Mostafa', 'Salma Hossam'],
      startTime: '2026-09-17T15:00:00.000Z',
      endTime: '2026-09-17T17:00:00.000Z',
      deadline: '2026-09-17T19:00:00.000Z',
    };

    const now = new Date('2026-09-17T12:00:00.000Z');
    const closest = findClosestSessionDue([sessionWithDetails], now);

    expect(closest?.sessionCode).toBe('ON-P3-6:00-8:00');
    expect(closest?.assignedStudents).toEqual(['Karim Mostafa', 'Salma Hossam']);
  });

  it('keeps a future session visible even when an attendance deadline is stale', () => {
    const futureSession = {
      ...baseSession,
      startTime: '2026-09-18T15:00:00.000Z',
      endTime: '2026-09-18T17:00:00.000Z',
      deadline: '2026-09-17T11:00:00.000Z',
    };

    const closest = findClosestSessionDue([futureSession], new Date('2026-09-17T12:00:00.000Z'));

    expect(closest?.id).toBe('s-1');
    expect(closest?.isCurrentlyActive).toBe(false);
  });

  it('uses the persisted effective occurrence while retaining the recurring base', () => {
    const closest = findClosestSessionDue(
      [{
        ...baseSession,
        startTime: '2026-09-18T16:00:00.000Z',
        endTime: '2026-09-18T18:00:00.000Z',
        baseStartTime: baseSession.startTime,
        isRescheduled: true,
        rescheduleReason: 'Tutor unavailable',
      }],
      new Date('2026-09-17T12:00:00.000Z')
    );

    expect(closest?.isRescheduled).toBe(true);
    expect(closest?.baseStartTime).toBe(baseSession.startTime);
    expect(closest?.startTime).toBe('2026-09-18T16:00:00.000Z');
  });

  it('shares countdown targeting without using the attendance deadline', () => {
    const timing = getSessionTimingTarget(
      '2026-09-17T14:00:00.000Z',
      '2026-09-17T16:00:00.000Z',
      '2026-09-17T15:00:00.000Z'
    );

    expect(timing.isActive).toBe(true);
    expect(timing.targetTimestamp).toBe('2026-09-17T16:00:00.000Z');
  });

  it('preserves duration when resolving a one-off effective start', () => {
    const timing = resolveEffectiveSessionTiming(
      '2026-09-17T14:00:00.000Z',
      '2026-09-17T16:00:00.000Z',
      '2026-09-18T10:00:00.000Z'
    );

    expect(timing.startTime).toBe('2026-09-18T10:00:00.000Z');
    expect(timing.endTime).toBe('2026-09-18T12:00:00.000Z');
  });
});
