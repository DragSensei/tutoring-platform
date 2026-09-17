import * as React from 'react';
import Link from 'next/link';
import { Calendar, LayoutDashboard } from 'lucide-react';

interface DashboardHeaderProps {
  tutorName: string;
}

export function DashboardHeader({ tutorName }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-6">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-semibold uppercase tracking-wider mb-2">
          Engineering Faculty Portal
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Welcome back, {tutorName}
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-1">
          Pick a session card to record students, review headcount, and monitor check-in deadlines.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/tutor/agenda"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors shadow-sm"
        >
          <Calendar className="h-4 w-4 text-stone-500" />
          <span>Full Agenda View</span>
        </Link>
      </div>
    </header>
  );
}
