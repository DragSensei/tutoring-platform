import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/features/auth/server/session';
import { getStudentWallet } from '@/features/wallets/server/wallet-actions';
import { StudentWalletView } from './_components/student-wallet-view';

export const dynamic = 'force-dynamic';

export default async function StudentWalletPage() {
  const session = await getSession();
  let studentUser = session?.userId && session.role === 'STUDENT'
    ? await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true } })
    : null;

  if (!studentUser) {
    studentUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
      select: { id: true, name: true },
    });
  }

  if (!studentUser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">No Student Account Available</h2>
        <p className="text-slate-500 mt-2">Log in or create a student to view the wallet.</p>
      </div>
    );
  }

  const wallet = await getStudentWallet(studentUser.id);
  return <StudentWalletView studentName={studentUser.name} wallet={wallet} />;
}
