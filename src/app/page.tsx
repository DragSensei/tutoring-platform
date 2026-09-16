import { prisma } from '@/shared/lib/prisma';
import { LandingClient } from './landing-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch sample active token for demo check-in link
  const activeSession = await prisma.session.findFirst({
    where: { status: 'ACTIVE' },
    select: { token: true },
  });

  const sampleToken = activeSession?.token || '22222222-3333-4444-5555-666666666666';

  return <LandingClient sampleToken={sampleToken} />;
}
