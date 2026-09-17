import type { GadwalSessionItem } from '@/features/sessions/types';

export interface DueCountdown {
  isPast: boolean;
  totalMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface ClosestSessionDue {
  id: string;
  title: string;
  sessionType: string;
  startTime: string;
  deadline: string;
  token: string;
  attendeeCount: number;
  isCurrentlyActive: boolean;
  targetTimestamp: string;
  initialCountdown: DueCountdown;
}

export function computeDueCountdown(
  targetTime: Date | string | number,
  currentTime: Date | string | number = new Date()
): DueCountdown {
  const targetMs = new Date(targetTime).getTime();
  const currentMs = new Date(currentTime).getTime();
  const diffMs = targetMs - currentMs;

  if (diffMs <= 0) {
    return {
      isPast: true,
      totalMs: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00:00:00',
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    isPast: false,
    totalMs: diffMs,
    hours,
    minutes,
    seconds,
    formatted,
  };
}

export function findClosestSessionDue(
  sessions: GadwalSessionItem[],
  currentTime: Date | string | number = new Date()
): ClosestSessionDue | null {
  const now = new Date(currentTime);
  const nowMs = now.getTime();

  // Valid candidates: sessions whose check-in window (deadline) has not passed yet
  const unexpiredSessions = sessions.filter(
    (s) => new Date(s.deadline).getTime() >= nowMs && s.status !== 'CANCELLED'
  );

  if (unexpiredSessions.length === 0) {
    return null;
  }

  // Sort candidate sessions by start time ascending
  unexpiredSessions.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const closest = unexpiredSessions[0];
  const startMs = new Date(closest.startTime).getTime();
  const deadlineMs = new Date(closest.deadline).getTime();

  // If already started and within deadline -> it is currently active
  const isCurrentlyActive = nowMs >= startMs && nowMs <= deadlineMs;

  // Target timestamp: if active, count down to deadline; if upcoming, count down to start time
  const targetTime = isCurrentlyActive ? closest.deadline : closest.startTime;
  const initialCountdown = computeDueCountdown(targetTime, now);

  return {
    id: closest.id,
    title: closest.title,
    sessionType: closest.sessionType,
    startTime: closest.startTime,
    deadline: closest.deadline,
    token: closest.token,
    attendeeCount: closest.attendeeCount,
    isCurrentlyActive,
    targetTimestamp: new Date(targetTime).toISOString(),
    initialCountdown,
  };
}
