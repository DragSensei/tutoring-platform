'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import { TablePagination } from '@/shared/components/table-pagination';
import { useTablePagination } from '@/shared/hooks/use-table-pagination';
import { TableToolbar } from '@/shared/components/table-toolbar';
import { matchesTableSearch } from '@/shared/utils/table-search';
import { TransactionType } from '@/shared/types';

export interface LedgerItem {
  id: string;
  amount: number;
  transactionType: TransactionType;
  sessionId?: string | null;
  createdAt: string;
}

interface TransactionLedgerProps {
  transactions: LedgerItem[];
}

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'ADMIN_DEPOSIT', label: 'admin deposit' },
  { value: 'SESSION_DEDUCTION', label: 'session deduction' },
  { value: 'REFUND', label: 'refund' },
];

export function TransactionLedger({ transactions }: TransactionLedgerProps) {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const filteredTransactions = transactions.filter((transaction) =>
    matchesTableSearch([transaction.transactionType, transaction.sessionId, transaction.createdAt, transaction.amount], search) &&
    (!typeFilter || transaction.transactionType === typeFilter)
  );
  const pagination = useTablePagination(filteredTransactions);
  const getBadge = (type: TransactionType) => {
    switch (type) {
      case 'ADMIN_DEPOSIT':
        return <Badge variant="success">Admin Deposit</Badge>;
      case 'SESSION_DEDUCTION':
        return <Badge variant="default">Session Deduction</Badge>;
      case 'REFUND':
        return <Badge variant="warning">Refund</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Transaction Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            No transactions recorded yet.
          </div>
        ) : (
          <>
            <TableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              resultCount={filteredTransactions.length}
              onClear={() => { setSearch(''); setTypeFilter(''); }}
              searchPlaceholder="Search transactions or references"
              filters={[{ id: 'type', label: 'type', value: typeFilter, onChange: setTypeFilter, options: TRANSACTION_TYPE_OPTIONS }]}
            />
            {filteredTransactions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-stone-500">No transactions match these filters.</div>
            ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagination.items.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {formatDateTime(tx.createdAt, { includeYear: true })}
                      </td>
                      <td className="px-4 py-2.5">{getBadge(tx.transactionType)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-500">
                        {tx.sessionId ? `Session: ${tx.sessionId.slice(-6)}` : 'Admin Action'}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-semibold ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${formatEGP(tx.amount)}` : formatEGP(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
            <TablePagination
              itemCount={filteredTransactions.length}
              page={pagination.page}
              pageCount={pagination.pageCount}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
            />
            </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
