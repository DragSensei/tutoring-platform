import type { GadwalSessionItem } from '@/features/sessions/types';
import {
  computeSessionCountdown,
  resolveEffectiveSessionTiming,
  type SessionCountdown,
} from '@/shared/utils/session-timing';

export interface ClosestSessionDue {
  id: string;
  title: string;
  sessionCode?: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  baseStartTime: string;
  deadline: string;
  token: string;
  attendeeCount: number;
  assignedStudents?: string[];
  isCurrentlyActive: boolean;
  isRescheduled: boolean;
  rescheduleReason?: string;
  targetTimestamp: string;
  initialCountdown: SessionCountdown;
}

export interface SessionTimingOverride {
  effectiveStartTime: string;
  reason: string;
}

export function findClosestSessionDue(
  sessions: GadwalSessionItem[],
  currentTime: Date | string | number = new Date(),
  overrides: Record<string, SessionTimingOverride> = {}
): ClosestSessionDue | null {
  const now = new Date(currentTime);
  const nowMs = now.getTime();

  // Timing is intentionally independent from the 4-hour attendance deadline.
  const candidates = sessions
    .filter((session) => session.status !== 'CANCELLED' && session.status !== 'COMPLETED')
    .map((session) => {
      const override = overrides[session.id];
      const effectiveTiming = resolveEffectiveSessionTiming(
        session.startTime,
        session.endTime,
        override?.effectiveStartTime
      );
      const effectiveStartMs = new Date(effectiveTiming.startTime).getTime();
      const effectiveEndMs = new Date(effectiveTiming.endTime).getTime();

      return { session, override, effectiveStartMs, effectiveEndMs };
    })
    .filter(({ effectiveStartMs, effectiveEndMs }) =>
      Number.isFinite(effectiveStartMs) && Number.isFinite(effectiveEndMs) && effectiveEndMs >= nowMs
    );

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => a.effectiveStartMs - b.effectiveStartMs);

  const closest = candidates[0];
  const isCurrentlyActive = nowMs >= closest.effectiveStartMs && nowMs <= closest.effectiveEndMs;
  const targetTime = isCurrentlyActive ? closest.effectiveEndMs : closest.effectiveStartMs;
  const initialCountdown = computeSessionCountdown(targetTime, now);

  const effectiveStartTime = new Date(closest.effectiveStartMs).toISOString();
  const effectiveEndTime = new Date(closest.effectiveEndMs).toISOString();

  return {
    id: closest.session.id,
    title: closest.session.title,
    sessionCode: closest.session.sessionCode,
    sessionType: closest.session.sessionType,
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    baseStartTime: closest.session.startTime,
    deadline: closest.session.deadline,
    token: closest.session.token,
    attendeeCount: closest.session.attendeeCount,
    assignedStudents: closest.session.assignedStudents,
    isCurrentlyActive,
    isRescheduled: Boolean(closest.override),
    rescheduleReason: closest.override?.reason,
    targetTimestamp: new Date(targetTime).toISOString(),
    initialCountdown,
  };
}
