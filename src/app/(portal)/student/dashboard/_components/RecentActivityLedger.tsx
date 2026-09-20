'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { TabularLedger, type LedgerRow } from '_vault/ui/data/tabular-ledger';
import { formatEGP } from '@/shared/utils/currency';
import { TableToolbar } from '@/shared/components/table-toolbar';
import { matchesTableSearch } from '@/shared/utils/table-search';

export interface WalletActivityEvent {
  id: string;
  amount: number;
  transactionType: string;
  sessionTitle?: string | null;
  createdAt: string;
  balanceAfter?: number;
}

interface RecentActivityLedgerProps {
  events: WalletActivityEvent[];
  currentBalance: number;
}

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'ADMIN_DEPOSIT', label: 'admin deposit' },
  { value: 'SESSION_DEDUCTION', label: 'session deduction' },
  { value: 'REFUND', label: 'refund' },
];

function formatUtcTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function formatAbsoluteAmount(val: number): string {
  const abs = Math.abs(val);
  return abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' EGP';
}

export function RecentActivityLedger({ events, currentBalance }: RecentActivityLedgerProps) {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  // Compute resulting balance backwards from current balance if not provided
  let running = currentBalance;
  const allRows: LedgerRow[] = events.map((ev, index) => {
    let balanceForThisRow = ev.balanceAfter;
    if (balanceForThisRow === undefined) {
      balanceForThisRow = running;
      // Subtract this event's delta to obtain the prior balance for next older event
      running = running - ev.amount;
    }

    const isCredit = ev.amount >= 0 || ev.transactionType === 'ADMIN_DEPOSIT' || ev.transactionType === 'REFUND';

    let description = 'Wallet Transaction';
    if (ev.transactionType === 'ADMIN_DEPOSIT') {
      description = 'Administrative Deposit / Top-up';
    } else if (ev.transactionType === 'SESSION_DEDUCTION') {
      description = ev.sessionTitle
        ? `Session Deduction: ${ev.sessionTitle}`
        : 'Session Attendance Fee';
    } else if (ev.transactionType === 'REFUND') {
      description = ev.sessionTitle
        ? `Refund: ${ev.sessionTitle}`
        : 'Session Attendance Refund';
    }

    return {
      id: ev.id || `ev-${index}`,
      date: formatUtcTimestamp(ev.createdAt),
      description,
      type: isCredit ? 'CREDIT' : 'DEBIT',
      amount: formatAbsoluteAmount(ev.amount),
      balanceAfter: formatEGP(balanceForThisRow),
    };
  });
  const rows = allRows.filter((_, index) => {
    const event = events[index];
    return matchesTableSearch([event.transactionType, event.sessionTitle, event.createdAt, event.amount], search) &&
      (!typeFilter || event.transactionType === typeFilter);
  });

  return (
    <section aria-label="Recent Activity" className="min-w-0 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-stone-900">
            Recent Wallet Activity
          </h2>
          <p className="text-xs text-stone-500">
            Latest transaction movements and attendance deductions.
          </p>
        </div>

        <Link
          href="/student/wallet"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-hover transition min-h-[44px] px-2 py-2"
        >
          <span>View All History</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <TabularLedger
        toolbar={<TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          resultCount={rows.length}
          onClear={() => { setSearch(''); setTypeFilter(''); }}
          searchPlaceholder="Search activity or session"
          filters={[{ id: 'activity-type', label: 'type', value: typeFilter, onChange: setTypeFilter, options: ACTIVITY_TYPE_OPTIONS }]}
        />}
        rows={rows}
        emptyMessage={events.length === 0 ? 'No wallet activity recorded yet. Deposits and session deductions will appear here.' : 'No wallet activity matches these filters.'}
      />
    </section>
  );
}
