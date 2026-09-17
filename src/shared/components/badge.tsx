import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-red-50 text-red-700 border-red-200',
    secondary: 'bg-slate-100 text-slate-800 border-slate-200',
    outline: 'border border-slate-300 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    destructive: 'bg-rose-100 text-rose-800 border-rose-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variants[variant],
          className
        )
      )}
      {...props}
    />
  );
}
