import { prisma } from '@/shared/lib/prisma';
import { getSession } from '@/features/auth/server/session';
import { getStudentWallet } from '@/features/wallets/server/wallet-actions';
import { BalanceCounter } from '@/features/wallets/components/balance-counter';
import { TransactionLedger } from '@/features/wallets/components/transaction-ledger';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';

export const dynamic = 'force-dynamic';

export default async function StudentWalletPage() {
  const session = await getSession();

  let studentId = session?.userId;
  let studentName = session?.name || 'Student';

  // Fallback to first student in DB if viewing without login
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Student Wallet & Ledger
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Account Holder: <span className="font-semibold text-slate-800">{studentName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-slate-500">
              Current Available Balance
            </CardTitle>
            {wallet.isFlaggedOverdraft ? (
              <Badge variant="destructive">Overdraft / Review</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            <BalanceCounter value={wallet.balance} />
            <p className="text-xs text-slate-500 mt-4">
              Sessions are automatically deducted upon attendance verification.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-800">
              Overdraft Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-2">
            <p>
              Students may attend sessions even with insufficient funds (credit / post-paid model).
            </p>
            <p>
              When balance drops below 0.00 EGP, your wallet is automatically flagged for
              administrative review.
            </p>
          </CardContent>
        </Card>
      </div>

      <TransactionLedger transactions={wallet.transactions} />
    </div>
  );
}
