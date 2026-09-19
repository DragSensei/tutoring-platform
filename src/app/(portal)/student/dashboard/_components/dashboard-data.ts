import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/features/auth/server/session';
import { getStudentWallet } from '@/features/wallets/server/wallet-actions';
import { isCheckInExpired } from '@/shared/utils/deadline';
import { SESSION_PRICING, SessionType } from '@/shared/types';
import type { ScheduledLecture } from './UpcomingLecturesCard';
import type { WalletActivityEvent } from './RecentActivityLedger';

export async function getStudentDashboardData() {
  const session = await getSession();
  let studentUser = null;

  if (session?.userId && session.role === 'STUDENT') {
    studentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true },
    });
  }

  if (!studentUser) {
    studentUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
      select: { id: true, name: true },
    });
  }

  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        name: 'Karim Mostafa',
        email: 'karim.mostafa@student.bigherorobotics.com',
        phone: '+201011112222',
        password_hash: 'seed_hash',
        role: 'STUDENT',
      },
      select: { id: true, name: true },
    });
  }

  const studentId = studentUser.id;
  const studentName = studentUser.name;
  const wallet = await getStudentWallet(studentId);

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Query upcoming lectures for this student/academy
  const upcomingSessions = await prisma.session.findMany({
    where: {
      status: { in: ['SCHEDULED', 'ACTIVE'] },
      deadline: { gte: now },
    },
    include: {
      tutor: { select: { name: true } },
    },
    orderBy: { start_time: 'asc' },
  });

  const studentAttendances = studentId
    ? await prisma.attendanceRecord.findMany({
        where: { student_id: studentId },
        select: { session_id: true },
      })
    : [];
  const attendedSessionIds = new Set(studentAttendances.map((a) => a.session_id));

  // Find next lecture scheduled for the current week (prioritizing un-attended)
  const nextSession =
    upcomingSessions.find(
      (s) => !attendedSessionIds.has(s.id) && new Date(s.start_time) <= weekAhead
    ) ||
    upcomingSessions.find((s) => new Date(s.start_time) <= weekAhead) ||
    null;

  let nextLecture: ScheduledLecture | null = null;
  if (nextSession) {
    let alreadyCheckedIn = false;
    if (studentId) {
      const existingAttendance = await prisma.attendanceRecord.findUnique({
        where: {
          session_id_student_id: {
            session_id: nextSession.id,
            student_id: studentId,
          },
        },
      });
      alreadyCheckedIn = Boolean(existingAttendance);
    }

    const price = SESSION_PRICING[nextSession.session_type as SessionType] || 375;
    const isWithinActiveWindow = !alreadyCheckedIn && !isCheckInExpired(nextSession.deadline, now);

    nextLecture = {
      id: nextSession.id,
      title: nextSession.title,
      tutorName: nextSession.tutor.name,
      startTime: nextSession.start_time.toISOString(),
      endTime: nextSession.end_time.toISOString(),
      deadline: nextSession.deadline.toISOString(),
      token: nextSession.token,
      price,
      sessionType: nextSession.session_type,
      isWithinActiveWindow,
      isAttended: alreadyCheckedIn,
    };
  }

  // Last 3-5 wallet events with session titles
  const recentTx = await prisma.walletTransaction.findMany({
    where: { wallet_id: wallet.id },
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      session: { select: { title: true } },
    },
  });

  const recentEvents: WalletActivityEvent[] = recentTx.map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    transactionType: tx.transaction_type,
    sessionTitle: tx.session?.title || null,
    createdAt: tx.created_at.toISOString(),
  }));

  return {
    student: {
      id: studentId,
      name: studentName,
    },
    wallet: {
      balance: wallet.balance,
      isFlaggedOverdraft: wallet.isFlaggedOverdraft,
    },
    nextLecture,
    recentEvents,
  };
}
