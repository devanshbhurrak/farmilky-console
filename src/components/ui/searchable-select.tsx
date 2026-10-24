import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  id: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (id: string) => void;
  /** Shown when the field is empty, e.g. "Select customer". */
  placeholder?: string;
  /** Fired as the user types so the parent can server-filter `options`. */
  onSearch?: (search: string) => void;
  disabled?: boolean;
}

/**
 * An input-shaped combobox: the field itself is typable. Clicking it opens the
 * option list directly underneath and typing filters it — no separate search
 * bar inside the dropdown.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Type to search…',
  onSearch,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(-1);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const positionMenu = useCallback(() => {
    const input = inputRef.current;
    if (!open || !input) return;
    const rect = input.getBoundingClientRect();
    // position: fixed keeps the menu out of any overflow ancestor
    // (e.g. the SheetBody drawer) so it is never clipped by the drawer.
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    positionMenu();
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);
    return () => {
      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };
  }, [open, positionMenu]);

  // Keep the highlighted option visible while arrowing through the list.
  useEffect(() => {
    if (!open || highlighted < 0) return;
    menuRef.current
      ?.querySelector(`#searchable-select-option-${highlighted}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  const close = () => {
    setOpen(false);
    setSearch('');
    setHighlighted(-1);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    close();
    onSearch?.('');
    // Keep focus out of the field after a pointer selection so the next click
    // re-focuses it with a fresh, empty search box (see handleFocus).
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    // Focus turns the field into an empty search box listing every option.
    if (!open) {
      setSearch('');
      setHighlighted(-1);
      onSearch?.('');
    }
    setOpen(true);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setSearch(next);
    setHighlighted(-1);
    setOpen(true);
    onSearch?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        close();
        onSearch?.('');
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setHighlighted((prev) => {
        if (prev < 0) return e.key === 'ArrowDown' ? 0 : filtered.length - 1;
        return e.key === 'ArrowDown'
          ? (prev + 1) % filtered.length
          : (prev - 1 + filtered.length) % filtered.length;
      });
      return;
    }
    if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      const target = filtered[highlighted >= 0 ? highlighted : 0];
      if (target) handleSelect(target.id);
    }
  };

  // Close when clicking outside the wrapper (the menu renders inside it).
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (wrapperRef.current?.contains(e.target as Node)) return;
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  const showClear =
    !disabled && (open ? Boolean(search) : Boolean(selectedOption));

  const handleClear = () => {
    if (open) {
      setSearch('');
      setHighlighted(-1);
      onSearch?.('');
      inputRef.current?.focus();
    } else {
      onChange('');
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="searchable-select-menu"
        aria-autocomplete="list"
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={open ? search : (selectedOption?.label ?? '')}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full rounded-lg border py-2 text-sm text-slate-900',
          'border-slate-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none',
          'min-h-11 pl-9',
          showClear ? 'pr-14' : 'pr-9',
          disabled && 'cursor-not-allowed bg-slate-100 opacity-60',
        )}
      />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={open ? 'Clear search' : 'Clear selection'}
          className="absolute top-1/2 right-8 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      )}
      <ChevronDown
        className={cn(
          'pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400 transition-transform',
          open && 'rotate-180',
        )}
      />

      {open && position && (
        <div
          ref={menuRef}
          id="searchable-select-menu"
          role="listbox"
          aria-label={placeholder}
          className="fixed z-50 max-h-60 overflow-y-auto rounded-lg border border-slate-300 bg-white py-1 shadow-overlay"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          {filtered.length === 0 ? (
            <div role="option" aria-disabled="true" className="px-3 py-2 text-sm text-slate-500">
              No matching options
            </div>
          ) : (
            filtered.map((option, index) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.id === value}
                id={`searchable-select-option-${index}`}
                onClick={() => handleSelect(option.id)}
                onMouseMove={() => setHighlighted(index)}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-sm',
                  option.id === value
                    ? 'bg-primary-50 font-medium text-primary-800'
                    : highlighted === index
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
