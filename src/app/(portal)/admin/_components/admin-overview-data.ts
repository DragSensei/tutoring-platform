import { prisma } from '@/shared/lib/prisma';
import type { SessionType, SessionStatus } from '@/shared/types';

export interface AdminOverviewData {
  kpis: {
    activeSessionsCount: number;
    completedSessionsCount: number;
    totalStudentsCount: number;
    totalTutorsCount: number;
    totalAttendancesCount: number;
    flaggedOverdraftsCount: number;
    totalNegativeDebtEgp: number;
  };
  flaggedWallets: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    balanceEgp: number;
  }>;
  recentSessions: Array<{
    id: string;
    title: string;
    tutorName: string;
    sessionType: SessionType;
    status: SessionStatus;
    startTime: string;
    attendeeCount: number;
  }>;
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const [
    activeSessionsCount,
    completedSessionsCount,
    totalStudentsCount,
    totalTutorsCount,
    totalAttendancesCount,
    flaggedWalletsRaw,
    recentSessionsRaw,
  ] = await Promise.all([
    prisma.session.count({
      where: { status: { in: ['SCHEDULED', 'ACTIVE'] } },
    }),
    prisma.session.count({
      where: { status: 'COMPLETED' },
    }),
    prisma.user.count({
      where: { role: 'STUDENT' },
    }),
    prisma.user.count({
      where: { role: 'TUTOR' },
    }),
    prisma.attendanceRecord.count(),
    prisma.wallet.findMany({
      where: { is_flagged_overdraft: true },
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { balance: 'asc' },
      take: 5,
    }),
    prisma.session.findMany({
      take: 4,
      orderBy: { start_time: 'desc' },
      include: {
        tutor: { select: { name: true } },
        _count: { select: { attendances: true } },
      },
    }),
  ]);

  const flaggedWallets = flaggedWalletsRaw.map((w) => ({
    id: w.id,
    studentName: w.user.name,
    studentEmail: w.user.email,
    studentPhone: w.user.phone,
    balanceEgp: Number(w.balance),
  }));

  const totalNegativeDebtEgp = flaggedWallets.reduce((sum, w) => {
    return w.balanceEgp < 0 ? sum + Math.abs(w.balanceEgp) : sum;
  }, 0);

  const recentSessions = recentSessionsRaw.map((s) => ({
    id: s.id,
    title: s.title,
    tutorName: s.tutor.name,
    sessionType: s.session_type as SessionType,
    status: s.status as SessionStatus,
    startTime: s.start_time.toISOString(),
    attendeeCount: s._count.attendances,
  }));

  return {
    kpis: {
      activeSessionsCount,
      completedSessionsCount,
      totalStudentsCount,
      totalTutorsCount,
      totalAttendancesCount,
      flaggedOverdraftsCount: flaggedWalletsRaw.length,
      totalNegativeDebtEgp,
    },
    flaggedWallets,
    recentSessions,
  };
}
