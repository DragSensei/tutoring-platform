'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/shared/components/button';

export interface TableToolbarFilter {
  id: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: TableToolbarFilter[];
  resultCount: number;
  onClear: () => void;
  searchPlaceholder?: string;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  filters = [],
  resultCount,
  onClear,
  searchPlaceholder = 'Search this table',
}: TableToolbarProps) {
  const hasFilters = Boolean(searchValue) || filters.some((filter) => Boolean(filter.value));

  return (
    <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search table</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white py-2 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
        </label>
        {filters.map((filter) => (
          <label key={filter.id} className="min-w-0">
            <span className="sr-only">Filter by {filter.label}</span>
            <select value={filter.value} onChange={(event) => filter.onChange(event.target.value)} className="min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 sm:w-auto">
              <option value="">All {filter.label}</option>
              {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm tabular-nums text-stone-500">{resultCount} {resultCount === 1 ? 'result' : 'results'}</span>
        {hasFilters && <Button type="button" variant="ghost" className="min-h-[44px] px-2 text-stone-700" onClick={onClear}><X className="mr-1 h-4 w-4" /> Clear</Button>}
      </div>
    </div>
  );
}
