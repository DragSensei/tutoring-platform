import React from 'react';

interface MetricKpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function MetricKpiCard({ label, value, subtext, trend }: MetricKpiCardProps) {
  return (
    <div className="group rounded-xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(25,24,23,0.04)] transition-all hover:border-stone-300">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-mono text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-medium ${
              trend.isPositive ? 'text-emerald-700' : 'text-stone-600'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      {subtext && <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">{subtext}</p>}
    </div>
  );
}
