import React, { type ReactNode } from 'react';

export interface LedgerRow {
  id: string;
  date: string;
  description: string;
  type: 'CREDIT' | 'DEBIT';
  amount: string;
  balanceAfter: string;
}

interface TabularLedgerProps {
  rows: LedgerRow[];
  emptyMessage?: string;
  toolbar?: ReactNode;
}

export function TabularLedger({ rows, emptyMessage = "No transactions recorded yet.", toolbar }: TabularLedgerProps) {
  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[0_1px_2px_rgba(25,24,23,0.04)]">
        {toolbar}
        <div className="bg-stone-50/50 py-12 text-center">
          <p className="text-xs text-stone-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[0_1px_2px_rgba(25,24,23,0.04)]">
      {toolbar}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3 sm:px-5">Timestamp (UTC)</th>
              <th className="px-4 py-3 sm:px-5">Description</th>
              <th className="px-4 py-3 sm:px-5 text-right">Change</th>
              <th className="px-4 py-3 sm:px-5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => {
              const isCredit = row.type === 'CREDIT';
              return (
                <tr key={row.id} className="transition-colors hover:bg-stone-50/60">
                  <td className="whitespace-nowrap px-4 py-3 sm:px-5 font-mono text-xs text-stone-500 tabular-nums">
                    {row.date}
                  </td>
                  <td className="px-4 py-3 sm:px-5 font-medium text-stone-900">{row.description}</td>
                  <td className={`whitespace-nowrap px-4 py-3 sm:px-5 text-right font-mono text-xs font-semibold tabular-nums ${
                    isCredit ? 'text-emerald-700' : 'text-stone-800'
                  }`}>
                    {isCredit ? `+${row.amount}` : `-${row.amount}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 sm:px-5 text-right font-mono text-xs text-stone-500 tabular-nums">
                    {row.balanceAfter}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
