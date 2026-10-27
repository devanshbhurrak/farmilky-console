import * as React from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function MonthSlider({
  month,
  year,
  onChange,
  className,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pickerYear, setPickerYear] = React.useState(year);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const step = (delta: number) => {
    const base = month + delta;
    const nextMonth = ((base - 1 + 12) % 12) + 1;
    const nextYear = year + Math.floor((base - 1) / 12);
    onChange(nextMonth, nextYear);
  };

  const selectMonth = (m: number) => {
    onChange(m, pickerYear);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!open) setPickerYear(year);
            setOpen((o) => !o);
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Selected period ${MONTHS_LONG[month - 1]} ${year}. Open month and year picker`}
          className={cn(
            'flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 transition-colors',
            open ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-900 hover:bg-slate-100',
          )}
        >
          <CalendarDays className="size-4 text-primary-600" aria-hidden />
          <span className="truncate text-sm font-semibold tracking-tight">
            {MONTHS_SHORT[month - 1]} {year}
          </span>
          <ChevronDown
            className={cn('size-4 text-slate-400 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose month and year"
          className="absolute right-0 left-0 z-40 mt-2 animate-fade-in rounded-xl border border-slate-200 bg-white p-3 shadow-overlay"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPickerYear((y) => y - 1)}
              aria-label="Previous year"
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="text-sm font-semibold text-slate-900">{pickerYear}</span>
            <button
              type="button"
              onClick={() => setPickerYear((y) => y + 1)}
              aria-label="Next year"
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_SHORT.map((label, i) => {
              const value = i + 1;
              const isSelected = value === month && pickerYear === year;
              const isCurrent = value === currentMonth && pickerYear === currentYear;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => selectMonth(value)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
                    isSelected
                      ? 'bg-primary-600 text-white shadow-sm'
                      : isCurrent
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200 ring-inset hover:bg-primary-100'
                        : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {(pickerYear !== currentYear || month !== currentMonth) && (
            <button
              type="button"
              onClick={() => {
                onChange(currentMonth, currentYear);
                setOpen(false);
              }}
              className="mt-3 w-full rounded-lg border-t border-slate-100 pt-2 text-center text-xs font-medium text-primary-700 transition-colors hover:text-primary-800 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              Jump to current month
            </button>
          )}
        </div>
      )}
    </div>
  );
}
