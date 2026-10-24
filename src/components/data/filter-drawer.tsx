import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function FilterButton({
  activeCount = 0,
  onClick,
  className,
}: {
  activeCount?: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
      className={cn(
        'flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors md:hidden',
        activeCount > 0
          ? 'border-primary-300 bg-primary-50 text-primary-700'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
        className,
      )}
    >
      <SlidersHorizontal className="size-4" aria-hidden />
      <span>Filters</span>
      {activeCount > 0 ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-semibold text-white">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}

export function FilterDrawer({
  open,
  onOpenChange,
  onApply,
  onReset,
  title = 'Filters',
  description,
  applyLabel = 'Apply filters',
  activeCount = 0,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
  onReset: () => void;
  title?: string;
  description?: string;
  applyLabel?: string;
  activeCount?: number;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh]">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />
        <SheetHeader className="border-b-0 pb-2">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : activeCount > 0 ? (
            <SheetDescription>
              {activeCount} active filter{activeCount > 1 ? 's' : ''}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4 pt-0">{children}</SheetBody>
        <SheetFooter className="flex flex-row items-center gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" onClick={onReset} className="min-h-12 flex-1">
            Reset
          </Button>
          <Button type="button" onClick={onApply} className="min-h-12 flex-[2]">
            {applyLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function useFilterDrawer<T extends Record<string, string>>(initial: T) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<T>(initial);
  const openDrawer = () => {
    setDraft(initial);
    setOpen(true);
  };
  function setField<K extends keyof T>(key: K, value: T[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  return { open, setOpen, draft, setDraft, setField, openDrawer };
}
