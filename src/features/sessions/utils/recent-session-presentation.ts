import type { SessionStatus } from '@/shared/types';

export function recentSessionState(status: SessionStatus, startTime: string, attendanceSaved: boolean, now = new Date()) {
  if (status === 'SCHEDULED' && new Date(startTime) < now) {
    return attendanceSaved ? 'Past · attendance submitted; finalization pending' : 'Past · attendance not submitted';
  }
  return status.toLowerCase();
}
