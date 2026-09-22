'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  className?: string;
}

export interface MultiComboboxProps {
  options: ComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  maxSelections?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 6;
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

function useFloatingMenu(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement>,
  menuRef: React.RefObject<HTMLElement>,
  contentKey: string | number,
) {
  const [position, setPosition] = React.useState<MenuPosition | null>(null);

  const updatePosition = React.useCallback(() => {
    if (!isOpen || !triggerRef.current || typeof window === 'undefined') {
      setPosition(null);
      return;
    }

    const trigger = triggerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(window.innerWidth - VIEWPORT_MARGIN * 2, 0);
    const width = Math.min(trigger.width, availableWidth);
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(trigger.left, VIEWPORT_MARGIN), maxLeft);
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 0;
    const belowTop = trigger.bottom + MENU_GAP;
    const canFitBelow = menuHeight === 0 || belowTop + menuHeight <= window.innerHeight - VIEWPORT_MARGIN;
    const canFitAbove = menuHeight > 0 && trigger.top - MENU_GAP - menuHeight >= VIEWPORT_MARGIN;
    const top = canFitBelow
      ? belowTop
      : canFitAbove
        ? trigger.top - MENU_GAP - menuHeight
        : Math.max(VIEWPORT_MARGIN, Math.min(belowTop, window.innerHeight - VIEWPORT_MARGIN - menuHeight));

    setPosition({
      top,
      left,
      width,
      maxHeight: Math.max(window.innerHeight - top - VIEWPORT_MARGIN, 1),
    });
  }, [isOpen, menuRef, triggerRef]);

  useIsomorphicLayoutEffect(() => {
    updatePosition();
  }, [contentKey, updatePosition]);

  React.useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (resizeObserver && menuRef.current) resizeObserver.observe(menuRef.current);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [isOpen, menuRef, updatePosition]);

  return position;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  name,
  required = false,
  className = '',
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);
  const menuPosition = useFloatingMenu(isOpen, triggerRef, menuRef, filteredOptions.length);

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target) {
        onChange(target.value);
        setIsOpen(false);
        setSearchQuery('');
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 w-full ${className}`}>
      {/* Hidden input for HTML form submissions */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`min-h-[44px] w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border text-left transition-colors bg-white ${
          disabled
            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
            : 'border-stone-200 text-stone-900 hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary'
        }`}
      >
        <span className="truncate block flex-1 min-w-0">
          {selectedOption ? (
            <span className="font-medium text-stone-900 truncate block">
              {selectedOption.label}{' '}
              {selectedOption.sublabel && (
                <span className="text-xs text-stone-500 font-normal">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-stone-400 truncate block">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-stone-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-brand-primary' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            width: menuPosition?.width ?? 0,
            maxHeight: menuPosition?.maxHeight,
            visibility: menuPosition ? 'visible' : 'hidden',
          }}
          className="fixed z-[100] flex max-w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {/* Search Field */}
          <div className="flex shrink-0 items-center gap-2 border-b border-stone-100 px-2.5 py-1.5">
            <Search className="h-4 w-4 text-stone-400 shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="min-h-[44px] min-w-0 w-full bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded text-stone-400 hover:text-stone-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="min-h-0 flex-1 overflow-y-auto py-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-stone-500 text-center">
                No matching options found.
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = option.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`min-h-[44px] w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                      isHighlighted
                        ? 'bg-brand-subtle text-brand-primary font-semibold'
                        : isSelected
                        ? 'bg-stone-50 text-stone-900 font-medium'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="min-w-0 truncate">
                      <span className="block truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className="block text-xs text-stone-500 font-normal">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-brand-primary shrink-0 ml-2" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function MultiCombobox({
  options,
  values,
  onChange,
  maxSelections = 4,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No matching options found.',
  name,
  disabled = false,
  className = '',
}: MultiComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selectedOptions = options.filter((option) => values.includes(option.value));
  const filteredOptions = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query) || option.sublabel?.toLowerCase().includes(query));
  }, [options, searchQuery]);
  const menuPosition = useFloatingMenu(isOpen, triggerRef, menuRef, filteredOptions.length);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleValue(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((current) => current !== value));
    } else if (values.length < maxSelections) {
      onChange([...values, value]);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => current < filteredOptions.length - 1 ? current + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => current > 0 ? current - 1 : filteredOptions.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) toggleValue(option.value);
    }
  }

  return (
    <div ref={containerRef} className={`relative min-w-0 w-full ${className}`}>
      {name && values.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { setIsOpen((current) => !current); setTimeout(() => inputRef.current?.focus(), 50); }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${disabled ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400' : 'border-stone-200 hover:border-stone-300'}`}
      >
        <span className="flex min-h-[24px] flex-wrap items-center gap-1.5 pr-6">
          {selectedOptions.length === 0 ? <span className="text-sm text-stone-400">{placeholder}</span> : selectedOptions.map((option) => (
            <span key={option.value} className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-subtle px-2 py-1 text-xs font-semibold text-brand-primary">
              <span className="truncate">{option.label}</span>
              <span className="sr-only">selected</span>
            </span>
          ))}
        </span>
        <ChevronDown className={`absolute right-3 top-3.5 h-4 w-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180 text-brand-primary' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            width: menuPosition?.width ?? 0,
            maxHeight: menuPosition?.maxHeight,
            visibility: menuPosition ? 'visible' : 'hidden',
          }}
          className="fixed z-[100] flex max-w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-stone-100 px-2.5 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setHighlightedIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="min-h-[44px] min-w-0 w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
              aria-label={searchPlaceholder}
            />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded text-stone-400 hover:text-stone-700" aria-label="Clear student search"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {filteredOptions.length === 0 ? <div className="px-4 py-3 text-center text-xs text-stone-500">{emptyMessage}</div> : filteredOptions.map((option, index) => {
              const isSelected = values.includes(option.value);
              const isAtCapacity = !isSelected && values.length >= maxSelections;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={isAtCapacity}
                  onClick={() => toggleValue(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${isAtCapacity ? 'cursor-not-allowed text-stone-300' : index === highlightedIndex ? 'bg-brand-subtle text-brand-primary' : 'text-stone-700 hover:bg-stone-50'}`}
                >
                  <span className="min-w-0 truncate"><span className="block truncate font-medium">{option.label}</span>{option.sublabel && <span className="block truncate text-xs text-stone-500">{option.sublabel}</span>}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="shrink-0 border-t border-stone-100 px-3 py-2 text-xs text-stone-500">{values.length} of {maxSelections} selected</div>
        </div>,
        document.body,
      )}
    </div>
  );
}
