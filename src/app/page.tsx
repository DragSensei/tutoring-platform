import { prisma } from '@/shared/lib/prisma';
import { LandingClient, StudentProfile, TutorProfile, UpcomingSessionItem } from './landing-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [studentsData, tutorsData, sessionsData] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: { wallet: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'TUTOR' },
      include: {
        tutored_sessions: {
          where: { status: { in: ['SCHEDULED', 'ACTIVE'] } },
          orderBy: { start_time: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.session.findMany({
      where: { status: { in: ['SCHEDULED', 'ACTIVE'] } },
      include: { tutor: true },
      orderBy: { start_time: 'asc' },
    }),
  ]);

  const students: StudentProfile[] = studentsData.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    balance: s.wallet ? Number(s.wallet.balance) : 0,
    isOverdraft: s.wallet ? s.wallet.is_flagged_overdraft : false,
  }));

  const tutors: TutorProfile[] = tutorsData.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    sessions: t.tutored_sessions.map((sess) => ({
      id: sess.id,
      title: sess.title,
      tutorName: t.name,
      tutorId: t.id,
      sessionType: sess.session_type as 'PRIVATE' | 'GROUP',
      startTime: sess.start_time.toISOString(),
      deadline: sess.deadline.toISOString(),
      token: sess.token,
      status: sess.status,
    })),
  }));

  const upcomingSessions: UpcomingSessionItem[] = sessionsData.map((s) => ({
    id: s.id,
    title: s.title,
    tutorName: s.tutor.name,
    tutorId: s.tutor_id,
    sessionType: s.session_type as 'PRIVATE' | 'GROUP',
    startTime: s.start_time.toISOString(),
    deadline: s.deadline.toISOString(),
    token: s.token,
    status: s.status,
  }));

  return (
    <LandingClient
      students={students}
      tutors={tutors}
      upcomingSessions={upcomingSessions}
    />
  );
}
