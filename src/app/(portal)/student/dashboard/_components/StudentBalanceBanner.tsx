import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatEGP } from '@/shared/utils/currency';

interface StudentBalanceBannerProps {
  studentName: string;
  balance: number;
}

export function StudentBalanceBanner({ studentName, balance }: StudentBalanceBannerProps) {
  const isPositive = balance > 375;
  const isLowBalance = balance >= 0 && balance <= 375;
  const isOverdraft = balance < 0;

  return (
    <section
      aria-label="Student Balance Overview"
      className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(25,24,23,0.04)] overflow-hidden"
    >
      <div className="h-1.5 w-[calc(100%+3rem)] bg-gradient-to-r from-brand-primary to-brand-hover -mt-6 -mx-6 mb-6" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-primary">
            Student Portal
          </span>
          <h1 className="font-serif text-2xl font-medium text-stone-900 sm:text-3xl pt-1">
            Welcome back, {studentName}
          </h1>
          <p className="text-xs text-stone-500">
            Academy account active &bull; Academic Year 2026/2027
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Link
            href="/student/wallet"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-subtle/60 px-3.5 py-2 text-xs font-semibold text-brand-primary shadow-xs transition hover:bg-brand-subtle hover:border-brand-primary active:scale-95"
          >
            <span>Payment History</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-brand-primary" />
          </Link>
        </div>
      </div>

      <div className="mt-6 border-t border-stone-100 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <span className="text-xs font-medium text-stone-500">
              Available Wallet Balance
            </span>
            <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-stone-900">
              {formatEGP(balance)}
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            {isPositive && (
              <span className="inline-flex items-center rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-800">
                Active
              </span>
            )}

            {isLowBalance && (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Low Balance - Upcoming Session Covered
              </span>
            )}

            {isOverdraft && (
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800">
                  Post-Paid Credit Active
                </span>
                <span className="text-[11px] text-rose-600">
                  Overdraft protection active (Policy limit: -1,000.00 EGP)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
