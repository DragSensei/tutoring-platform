import React from 'react';

interface StatusNoticeProps {
  variant: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function StatusNotice({ variant, title, message, action }: StatusNoticeProps) {
  const styles = {
    info: 'border-stone-200 bg-stone-50/80 text-stone-800',
    warning: 'border-amber-200/80 bg-amber-50/40 text-amber-900',
    critical: 'border-rose-200/80 bg-rose-50/30 text-rose-900',
    success: 'border-emerald-200/80 bg-emerald-50/40 text-emerald-900',
  }[variant];

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 text-xs ${styles}`}>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 opacity-80 leading-relaxed">{message}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="self-start sm:self-auto rounded-md border border-current/25 bg-white/70 px-3 py-1.5 font-medium transition-all hover:bg-white active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
