export interface SessionCountdown {
  isPast: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface SessionTimingTarget {
  targetTimestamp: string;
  isActive: boolean;
  hasEnded: boolean;
}

export interface EffectiveSessionTiming {
  startTime: string;
  endTime: string;
  isRescheduled: boolean;
}

export type SessionOccurrenceState = 'ACTIVE' | 'SCHEDULED' | 'COMPLETED';
export type TimedSessionOccurrence = { startTime: string; endTime: string };

export function classifySessionOccurrence(
  startTime: Date | string | number,
  endTime: Date | string | number,
  now: Date | string | number = new Date()
): SessionOccurrenceState {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const current = new Date(now).getTime();
  if (![start, end, current].every(Number.isFinite) || end <= start) {
    throw new Error('Invalid concrete Session timing');
  }
  if (current < start) return 'SCHEDULED';
  if (current < end) return 'ACTIVE';
  return 'COMPLETED';
}

export function canPostponeSession(
  startTime: Date | string | number,
  now: Date | string | number = new Date()
): boolean {
  const start = new Date(startTime).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current)) throw new Error('Invalid concrete Session timing');
  return current < start;
}

export function sortSessionOccurrences<T extends TimedSessionOccurrence>(
  sessions: T[],
  state: SessionOccurrenceState,
  now: Date | string | number = new Date()
): T[] {
  return sessions
    .filter((session) => classifySessionOccurrence(session.startTime, session.endTime, now) === state)
    .sort((left, right) => {
      const difference = new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
      return state === 'COMPLETED' ? -difference : difference;
    });
}

export function getUpcomingSessions<T extends TimedSessionOccurrence>(
  sessions: T[],
  horizonDays: number | null = 7,
  now: Date | string | number = new Date()
): T[] {
  const current = new Date(now).getTime();
  const through = horizonDays === null ? Number.POSITIVE_INFINITY : current + horizonDays * 86_400_000;
  return sessions
    .filter((session) => classifySessionOccurrence(session.startTime, session.endTime, now) === 'SCHEDULED')
    .filter((session) => new Date(session.startTime).getTime() <= through)
    .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime());
}

export function resolveEffectiveSessionTiming(
  startTime: string,
  endTime: string,
  effectiveStartTime?: string
): EffectiveSessionTiming {
  if (!effectiveStartTime) {
    return { startTime, endTime, isRescheduled: false };
  }

  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const effectiveStartMs = new Date(effectiveStartTime).getTime();

  return {
    startTime: new Date(effectiveStartMs).toISOString(),
    endTime: new Date(endMs + (effectiveStartMs - startMs)).toISOString(),
    isRescheduled: true,
  };
}

export function computeSessionCountdown(
  targetTime: Date | string | number,
  currentTime: Date | string | number = new Date()
): SessionCountdown {
  const diffMs = new Date(targetTime).getTime() - new Date(currentTime).getTime();

  if (diffMs <= 0) {
    return { isPast: true, totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00:00' };
  }

  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  const seconds = Math.floor((diffMs % 60_000) / 1_000);
  const pad = (value: number) => value.toString().padStart(2, '0');

  return {
    isPast: false,
    totalMs: diffMs,
    days,
    hours,
    minutes,
    seconds,
    formatted: `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

export function getSessionTimingTarget(
  startTime: string,
  endTime: string,
  currentTime: Date | string | number = new Date()
): SessionTimingTarget {
  const nowMs = new Date(currentTime).getTime();
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const isActive = nowMs >= startMs && nowMs < endMs;

  return {
    targetTimestamp: isActive ? endTime : startTime,
    isActive,
    hasEnded: nowMs >= endMs,
  };
}
