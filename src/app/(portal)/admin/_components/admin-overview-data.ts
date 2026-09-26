import { prisma } from '@/shared/lib/prisma';
import type { SessionStatus, SessionType } from '@/shared/types';
import { addCalendarDays, parseCalendarDate } from '@/shared/utils/calendar-date';
import { formatAcademyDateInput } from '@/shared/utils/date-format';
import { startOfCairoDay } from '@/shared/utils/academy-day';
import { getAdminAttendanceAttention, type AdminAttendanceAttentionItem } from '@/features/attendance/server/admin-attendance';

export function getCairoDayRange(now = new Date()) {
  const today = formatAcademyDateInput(now);
  const tomorrow = addCalendarDays(parseCalendarDate(today), 1).toISOString().slice(0, 10);
  return { from: startOfCairoDay(today), to: startOfCairoDay(tomorrow), date: today };
}

export interface AdminOverviewData {
  date: string;
  asOf: string;
  checkInWindowHours: number;
  attention: AdminAttendanceAttentionItem[];
  sessions: Array<{
    id: string;
    title: string;
    tutorName: string;
    sessionType: SessionType;
    status: SessionStatus;
    startTime: string;
    endTime: string;
    attendeeCount: number;
    attendanceSaved: boolean;
    attendanceSubmitted: boolean;
  }>;
}

export async function getAdminOverviewData(now = new Date()): Promise<AdminOverviewData> {
  const range = getCairoDayRange(now);
  const [rows, policy, attention] = await Promise.all([prisma.session.findMany({
    where: { historical_only: false, start_time: { gte: range.from, lt: range.to } },
    orderBy: [{ start_time: 'asc' }, { id: 'asc' }],
    select: {
      id: true, title: true, session_type: true, status: true, start_time: true, end_time: true,
      attendance_saved_at: true, attendance_submitted_at: true, tutor: { select: { name: true } }, _count: { select: { attendances: true } },
    },
  }), prisma.platformPolicy.findUnique({ where: { id: 'default' }, select: { check_in_window_hours: true } }), getAdminAttendanceAttention(now)]);
  return {
    date: range.date,
    asOf: now.toISOString(),
    checkInWindowHours: policy?.check_in_window_hours ?? 4,
    attention,
    sessions: rows.map((session) => ({
      id: session.id, title: session.title, tutorName: session.tutor.name ?? 'Not provided',
      sessionType: session.session_type as SessionType, status: session.status as SessionStatus,
      startTime: session.start_time.toISOString(), endTime: session.end_time.toISOString(),
      attendeeCount: session._count.attendances, attendanceSaved: Boolean(session.attendance_saved_at), attendanceSubmitted: Boolean(session.attendance_submitted_at),
    })),
  };
}
