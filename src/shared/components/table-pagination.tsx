'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/button';

interface TablePaginationProps {
  itemCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  itemCount,
  page,
  pageCount,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  if (pageCount <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, itemCount);

  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-col gap-3 border-t border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-stone-600" aria-live="polite">
        Showing <span className="font-medium tabular-nums text-stone-900">{firstItem}–{lastItem}</span> of{' '}
        <span className="font-medium tabular-nums text-stone-900">{itemCount}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] px-3"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1">Previous</span>
        </Button>
        <span className="min-w-20 text-center text-sm font-medium tabular-nums text-stone-700">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] px-3"
          aria-label="Next page"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="mr-1">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
