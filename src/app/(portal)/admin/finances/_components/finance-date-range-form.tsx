'use client';

import { useState } from 'react';
import { DatePicker } from '@/shared/components/date-picker';

export function FinanceDateRangeForm({ from, to }: { from: string; to: string }) {
  const [selectedFrom, setSelectedFrom] = useState(from);
  const [selectedTo, setSelectedTo] = useState(to);
  return (
    <form action="/admin/finances" method="get" className="flex flex-col gap-4 border-t border-border-subtle pt-4 sm:flex-row sm:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-text-primary">From
        <DatePicker aria-label="From" value={selectedFrom} onChange={setSelectedFrom} clearable={false} />
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-text-primary">To
        <DatePicker aria-label="To" value={selectedTo} onChange={setSelectedTo} clearable={false} />
      </label>
      <input type="hidden" name="from" value={selectedFrom} />
      <input type="hidden" name="to" value={selectedTo} />
      <button type="submit" className="min-h-[44px] rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-brand-subtle hover:bg-brand-hover">Apply dates</button>
    </form>
  );
}
