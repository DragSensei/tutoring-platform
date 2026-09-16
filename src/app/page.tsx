import { prisma } from '@/shared/lib/prisma';
import { LandingClient } from './landing-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch real counts from PostgreSQL
  const [activeSessionsCount, totalStudentsCount, activeTutorsCount] = await Promise.all([
    prisma.session.count({ where: { status: { in: ['SCHEDULED', 'ACTIVE'] } } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TUTOR' } }),
  ]);

  // Fetch sample tokens for demonstration
  const [privateSession, groupSession, expiredSession] = await Promise.all([
    prisma.session.findFirst({
      where: { session_type: 'PRIVATE', status: 'ACTIVE' },
      select: { token: true },
    }),
    prisma.session.findFirst({
      where: { session_type: 'GROUP', status: 'ACTIVE' },
      select: { token: true },
    }),
    prisma.session.findFirst({
      where: { status: 'COMPLETED' },
      select: { token: true },
    }),
  ]);

  const sampleTokens = {
    activePrivate: privateSession?.token || '11111111-2222-3333-4444-555555555555',
    activeGroup: groupSession?.token || '22222222-3333-4444-5555-666666666666',
    expired: expiredSession?.token || '99999999-8888-7777-6666-555555555555',
  };

  return (
    <LandingClient
      stats={{
        activeSessionsCount,
        totalStudentsCount,
        activeTutorsCount,
      }}
      sampleTokens={sampleTokens}
    />
  );
}
