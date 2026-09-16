import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
}

export function EmptyState({ title, description, actionText, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/40 px-6 py-14 text-center">
      <h3 className="font-serif text-lg font-medium text-stone-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-stone-500 leading-relaxed">{description}</p>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm transition-all hover:bg-stone-50 active:scale-95"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}
