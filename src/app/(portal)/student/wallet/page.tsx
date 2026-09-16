import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/features/auth/server/session';
import { getStudentWallet } from '@/features/wallets/server/wallet-actions';
import { StudentWalletView } from './_components/student-wallet-view';

export const dynamic = 'force-dynamic';

export default async function StudentWalletPage() {
  const session = await getSession();
  let studentId = session?.userId;
  let studentName = session?.name || 'Student';

  if (!studentId) {
    const studentUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
    });
    if (studentUser) {
      studentId = studentUser.id;
      studentName = studentUser.name;
    }
  }

  if (!studentId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">No Student Account Available</h2>
        <p className="text-slate-500 mt-2">Log in or create a student to view the wallet.</p>
      </div>
    );
  }

  const wallet = await getStudentWallet(studentId);
  return <StudentWalletView studentName={studentName} wallet={wallet} />;
}
