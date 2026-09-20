export interface SessionCountdown {
  isPast: boolean;
  totalMs: number;
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
    return { isPast: true, totalMs: 0, hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00' };
  }

  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  const seconds = Math.floor((diffMs % 60_000) / 1_000);
  const pad = (value: number) => value.toString().padStart(2, '0');

  return {
    isPast: false,
    totalMs: diffMs,
    hours,
    minutes,
    seconds,
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
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
  const isActive = nowMs >= startMs && nowMs <= endMs;

  return {
    targetTimestamp: isActive ? endTime : startTime,
    isActive,
    hasEnded: nowMs > endMs,
  };
}
