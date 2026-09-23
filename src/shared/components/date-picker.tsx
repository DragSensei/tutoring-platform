'use client';

import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { PortalPopover, type PopoverCloseReason } from '@/shared/components/portal-popover';
import { addCalendarDays, addCalendarMonthsClamped, calendarMonthGrid, formatCalendarDate, formatCalendarDateLabel, parseCalendarDate } from '@/shared/utils/calendar-date';
import { formatAcademyDateInput } from '@/shared/utils/date-format';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  clearable?: boolean;
  disabled?: boolean;
}

const WEEKDAYS = [
  { short: 'S', full: 'Sunday' }, { short: 'M', full: 'Monday' }, { short: 'T', full: 'Tuesday' },
  { short: 'W', full: 'Wednesday' }, { short: 'T', full: 'Thursday' }, { short: 'F', full: 'Friday' },
  { short: 'S', full: 'Saturday' },
];

function parseOrToday(value: string) {
  try { return value ? parseCalendarDate(value) : parseCalendarDate(formatAcademyDateInput()); }
  catch { return parseCalendarDate(formatAcademyDateInput()); }
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function DatePicker({ value, onChange, 'aria-label': label, clearable = true, disabled = false }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const initialDate = parseOrToday(value);
  const [month, setMonth] = React.useState(() => monthStart(initialDate));
  const [activeDate, setActiveDate] = React.useState(initialDate);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const dayRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const monthDays = calendarMonthGrid(month);
  const today = formatAcademyDateInput();
  const monthLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(month);

  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const onPopoverClose = React.useCallback((reason: PopoverCloseReason) => close(reason === 'escape'), [close]);

  React.useEffect(() => {
    if (open) dayRefs.current.get(formatCalendarDate(activeDate))?.focus();
  }, [activeDate, month, open]);

  function openPicker() {
    const selected = parseOrToday(value);
    setActiveDate(selected);
    setMonth(monthStart(selected));
    setOpen(true);
  }

  function chooseDate(date: Date) {
    onChange(formatCalendarDate(date));
    close(true);
  }

  function moveActiveDate(event: React.KeyboardEvent<HTMLButtonElement>, date: Date) {
    let next: Date | null = null;
    if (event.key === 'ArrowLeft') next = addCalendarDays(date, -1);
    if (event.key === 'ArrowRight') next = addCalendarDays(date, 1);
    if (event.key === 'ArrowUp') next = addCalendarDays(date, -7);
    if (event.key === 'ArrowDown') next = addCalendarDays(date, 7);
    if (event.key === 'Home') next = addCalendarDays(date, -date.getUTCDay());
    if (event.key === 'End') next = addCalendarDays(date, 6 - date.getUTCDay());
    if (event.key === 'PageUp') next = addCalendarMonthsClamped(date, event.shiftKey ? -12 : -1);
    if (event.key === 'PageDown') next = addCalendarMonthsClamped(date, event.shiftKey ? 12 : 1);
    if (!next) return;
    event.preventDefault();
    setActiveDate(next);
    setMonth(monthStart(next));
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => open ? close() : openPicker()}
        className="inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-left text-sm text-text-primary hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:bg-canvas-subtle disabled:text-text-subtle"
      >
        <span className={value ? '' : 'text-text-subtle'}>{value ? formatCalendarDateLabel(value) : 'Choose date'}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
      </button>
      <PortalPopover
        open={open}
        triggerRef={triggerRef}
        panelRef={panelRef}
        label={`${label} calendar`}
        contentKey={formatCalendarDate(month)}
        minWidth={344}
        onClose={onPopoverClose}
      >
        <div className="min-w-0 space-y-2">
          <div className="flex min-h-11 items-center justify-between gap-2">
            <button type="button" aria-label="Previous month" onClick={() => {
              const nextMonth = addCalendarMonthsClamped(month, -1);
              setMonth(monthStart(nextMonth));
              setActiveDate(monthStart(nextMonth));
            }} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2 className="text-sm font-semibold text-text-primary" aria-live="polite">{monthLabel}</h2>
            <button type="button" aria-label="Next month" onClick={() => {
              const nextMonth = addCalendarMonthsClamped(month, 1);
              setMonth(monthStart(nextMonth));
              setActiveDate(monthStart(nextMonth));
            }} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div role="grid" aria-label={monthLabel} className="space-y-0">
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((day, index) => <span key={`${day.full}-${index}`} role="columnheader" aria-label={day.full} className="flex h-11 items-center justify-center text-xs font-medium text-text-muted">{day.short}</span>)}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7">
                {monthDays.slice(week * 7, week * 7 + 7).map((date) => {
                  const dateKey = formatCalendarDate(date);
                  const selected = value === dateKey;
                  const inMonth = date.getUTCMonth() === month.getUTCMonth();
                  return (
                    <button
                      key={dateKey}
                      ref={(element) => { if (element) dayRefs.current.set(dateKey, element); else dayRefs.current.delete(dateKey); }}
                      type="button"
                      role="gridcell"
                      tabIndex={formatCalendarDate(activeDate) === dateKey ? 0 : -1}
                      aria-label={formatCalendarDateLabel(dateKey)}
                      aria-selected={selected}
                      aria-current={dateKey === today ? 'date' : undefined}
                      onKeyDown={(event) => moveActiveDate(event, date)}
                      onClick={() => chooseDate(date)}
                      className={`h-11 min-w-0 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 ${selected ? 'bg-brand-primary font-semibold text-white' : dateKey === today ? 'border border-brand-border font-semibold text-brand-primary' : inMonth ? 'text-text-primary hover:bg-canvas-subtle' : 'text-text-subtle hover:bg-canvas-subtle'}`}
                    >
                      {date.getUTCDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2 border-t border-border-subtle pt-2">
            <button type="button" onClick={() => chooseDate(parseCalendarDate(today))} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-brand-primary hover:bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">Today</button>
            {clearable && value && <button type="button" onClick={() => { onChange(''); close(true); }} className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-text-muted hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">Clear date</button>}
          </div>
        </div>
      </PortalPopover>
    </>
  );
}
