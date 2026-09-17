import * as React from 'react';

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
    </div>
  );
}
