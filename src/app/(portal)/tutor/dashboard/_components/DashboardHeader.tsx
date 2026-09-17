import * as React from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

interface DashboardHeaderProps {
  tutorName: string;
}

export function DashboardHeader({ tutorName }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200/80 pb-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-700">
          Faculty Portal
        </span>
        <span className="text-xs sm:text-sm font-semibold text-stone-800">
          {tutorName}
        </span>
      </div>

      <Link
        href="/tutor/agenda"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
      >
        <Calendar className="h-3.5 w-3.5 text-stone-500" />
        <span>Full Timetable</span>
      </Link>
    </div>
  );
}
