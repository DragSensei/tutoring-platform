import type { GadwalSessionItem } from '@/features/sessions/types';
import {
  computeSessionCountdown,
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
  attendeeCount: number;
  assignedStudents?: string[];
  isCurrentlyActive: boolean;
  isRescheduled: boolean;
  rescheduleReason?: string;
  targetTimestamp: string;
  initialCountdown: SessionCountdown;
}

export function findClosestSessionDue(
  sessions: GadwalSessionItem[],
  currentTime: Date | string | number = new Date(),
): ClosestSessionDue | null {
  const now = new Date(currentTime);
  const nowMs = now.getTime();

  // Timing is intentionally independent from the attendance grace close.
  const candidates = sessions
    .filter((session) => session.status !== 'CANCELLED' && session.status !== 'COMPLETED')
    .map((session) => {
      const effectiveStartMs = new Date(session.startTime).getTime();
      const effectiveEndMs = new Date(session.endTime).getTime();
      return { session, effectiveStartMs, effectiveEndMs };
    })
    .filter(({ effectiveStartMs, effectiveEndMs }) =>
      Number.isFinite(effectiveStartMs) && Number.isFinite(effectiveEndMs) && effectiveEndMs > nowMs
    );

  if (candidates.length === 0) {
    return null;
  }

  const live = candidates
    .filter(({ effectiveStartMs }) => effectiveStartMs <= nowMs)
    .sort((a, b) => a.effectiveStartMs - b.effectiveStartMs);
  const future = candidates
    .filter(({ effectiveStartMs }) => effectiveStartMs > nowMs)
    .sort((a, b) => a.effectiveStartMs - b.effectiveStartMs);

  const closest = live[0] || future[0];
  const isCurrentlyActive = nowMs >= closest.effectiveStartMs && nowMs < closest.effectiveEndMs;
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
    baseStartTime: closest.session.baseStartTime || closest.session.startTime,
    deadline: closest.session.deadline,
    attendeeCount: closest.session.attendeeCount,
    assignedStudents: closest.session.assignedStudents,
    isCurrentlyActive,
    isRescheduled: Boolean(closest.session.isRescheduled),
    rescheduleReason: closest.session.rescheduleReason || undefined,
    targetTimestamp: new Date(targetTime).toISOString(),
    initialCountdown,
  };
}
