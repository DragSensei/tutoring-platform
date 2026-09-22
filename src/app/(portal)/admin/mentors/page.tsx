import { prisma } from '@/shared/lib/prisma';
import { AdminMentorsView } from './_components/admin-mentors-view';

export const dynamic = 'force-dynamic';

export default async function AdminMentorsPage() {
  const mentors = await prisma.user.findMany({
    where: { role: 'TUTOR' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      _count: { select: { tutored_sessions: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <AdminMentorsView
      mentors={mentors.map((m) => ({
        id: m.id,
        name: m.name ?? 'Not provided',
        email: m.email ?? 'Not provided',
        phone: m.phone ?? 'Not provided',
        sessionsCount: m._count.tutored_sessions,
      }))}
    />
  );
}
