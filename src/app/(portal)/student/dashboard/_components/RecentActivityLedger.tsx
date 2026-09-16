import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { TabularLedger, type LedgerRow } from '_vault/ui/data/tabular-ledger';
import { formatEGP } from '@/shared/utils/currency';

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
  }).format(d) + ' UTC';
}

function formatAbsoluteAmount(val: number): string {
  const abs = Math.abs(val);
  return abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' EGP';
}

export function RecentActivityLedger({ events, currentBalance }: RecentActivityLedgerProps) {
  // Compute resulting balance backwards from current balance if not provided
  let running = currentBalance;
  const rows: LedgerRow[] = events.map((ev, index) => {
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

  return (
    <section aria-label="Recent Activity" className="space-y-4">
      <div className="flex items-center justify-between">
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
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-950 transition"
        >
          <span>View All History</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <TabularLedger
        rows={rows}
        emptyMessage="No wallet activity recorded yet. Deposits and session deductions will appear here."
      />
    </section>
  );
}
