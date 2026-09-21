import { getGadwalSessions } from '@/features/sessions/server/session-actions';
import { prisma } from '@/shared/lib/prisma';
import { AdminGadwalView } from './_components/admin-gadwal-view';

export const dynamic = 'force-dynamic';

export default async function AdminGadwalPage() {
  const [sessions, tutors, students] = await Promise.all([
    getGadwalSessions(),
    prisma.user.findMany({ where: { role: 'TUTOR' }, select: { id: true, name: true, email: true } }),
    prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true, name: true, email: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
  ]);

  return <AdminGadwalView sessions={sessions} tutors={tutors} students={students} />;
}
