'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import { Badge } from '@/shared/components/badge';
import { formatEGP } from '@/shared/utils/currency';
import { TopUpModal } from '@/features/wallets/components/top-up-modal';
import { useRouter } from 'next/navigation';

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Student Wallets & Overdraft Ledger
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review student balances, credit/post-paid sessions, and execute admin top-up deposits.
          </p>
        </div>

        {overdraftCount > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-2 flex items-center gap-2 text-rose-700 text-sm font-semibold">
            <span>⚠️</span> {overdraftCount} Wallet(s) in Overdraft (Flagged for Review)
          </div>
        )}
      </div>

      <Card>
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
                            size="sm"
                            onClick={() => openTopUp(w)}
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

      <TopUpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
        onSuccess={handleDepositSuccess}
      />
    </div>
  );
}
