import type { SessionStatus } from '@/shared/types';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';

export function recentSessionState(
  status: SessionStatus,
  startTime: string,
  endTime: string,
  attendanceSaved: boolean,
  now = new Date(),
  checkInWindowHours = 4,
) {
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'COMPLETED') return 'Completed';

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start) return 'Later today';
  if (now < end) return 'Live now';
  if (!attendanceSaved) return 'Needs attention';
  if (now >= computeAttendanceClosesAt(end, checkInWindowHours)) return 'Ready to finalize';
  return 'Attendance submitted · grace period open';
}
