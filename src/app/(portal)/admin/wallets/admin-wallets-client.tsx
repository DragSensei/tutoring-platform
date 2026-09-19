'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import { Badge } from '@/shared/components/badge';
import { formatEGP } from '@/shared/utils/currency';
import { TopUpModal } from '@/features/wallets/components/top-up-modal';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

export interface WalletUserItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  role: string;
  balance: number;
  isFlaggedOverdraft: boolean;
  transactionCount: number;
  updatedAt: string;
}

interface AdminWalletsClientProps {
  wallets: WalletUserItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AdminWalletsClient({ wallets }: AdminWalletsClientProps) {
  const router = useRouter();
  const [selectedStudent, setSelectedStudent] = React.useState<{
    id: string;
    name: string;
    currentBalance: number;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const openTopUp = (w: WalletUserItem) => {
    setSelectedStudent({
      id: w.userId,
      name: w.userName,
      currentBalance: w.balance,
    });
    setIsModalOpen(true);
  };

  const handleDepositSuccess = () => {
    router.refresh();
  };

  const overdraftCount = wallets.filter((w) => w.isFlaggedOverdraft || w.balance < 0).length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 w-full min-w-0"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-5 min-h-[92px]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Admin Console
            </span>
            <span className="text-xs font-semibold text-stone-500">Wallets & Financials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1 truncate">
            Student Wallets & Overdraft Ledger
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 line-clamp-1">
            Review student balances, credit/post-paid sessions, and execute admin top-up deposits.
          </p>
        </div>

        {overdraftCount > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-rose-700 text-sm font-semibold self-start sm:self-auto">
            <span>⚠️</span> {overdraftCount} Wallet(s) in Overdraft
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="w-full rounded-2xl border-stone-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg">Registered Student Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          {wallets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No wallets found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Transactions</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wallets.map((w) => {
                    const isOverdraft = w.isFlaggedOverdraft || w.balance < 0;
                    return (
                      <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{w.userName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <div>{w.userEmail}</div>
                          <div>{w.userPhone}</div>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-bold ${
                            w.balance < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatEGP(w.balance)}
                        </td>
                        <td className="px-4 py-3">
                          {isOverdraft ? (
                            <Badge variant="destructive">Overdraft Flagged</Badge>
                          ) : (
                            <Badge variant="success">Good Standing</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{w.transactionCount} records</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            onClick={() => openTopUp(w)}
                            className="min-h-[44px] text-sm px-3.5 font-medium"
                          >
                            Top Up Funds
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      <TopUpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
        onSuccess={handleDepositSuccess}
      />
    </motion.div>
  );
}
