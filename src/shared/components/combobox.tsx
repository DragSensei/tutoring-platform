'use client';

import * as React from 'react';
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

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML form submissions */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      {/* Trigger Button */}
      <button
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
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-stone-200 shadow-lg overflow-hidden py-1">
          {/* Search Field */}
          <div className="px-2.5 py-1.5 border-b border-stone-100 flex items-center gap-2">
            <Search className="h-4 w-4 text-stone-400 shrink-0" />
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
              className="min-h-[36px] w-full bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center text-stone-400 hover:text-stone-600 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1">
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
                    <div className="truncate">
                      <span className="block truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className="block text-xs text-stone-500 font-normal">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-brand-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
