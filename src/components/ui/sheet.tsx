import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const SheetContext = React.createContext<{ close: () => void }>({ close: () => {} });

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;
  return (
    <SheetContext.Provider value={{ close }}>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 animate-fade-in bg-slate-900/50" onClick={close} aria-hidden />
        {children}
      </div>
    </SheetContext.Provider>
  );
}

interface SheetContentProps {
  side?: 'bottom' | 'right' | 'left';
  className?: string;
  children: React.ReactNode;
}

export function SheetContent({ side = 'bottom', className, children }: SheetContentProps) {
  const { close } = React.useContext(SheetContext);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'absolute flex flex-col bg-white shadow-overlay outline-none',
        side === 'bottom' &&
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl animate-slide-up lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[480px] lg:max-h-none lg:rounded-none lg:animate-fade-in',
        side === 'right' && 'inset-y-0 right-0 w-full max-w-md animate-fade-in',
        side === 'left' && 'inset-y-0 left-0 w-full max-w-md animate-fade-in',
        className,
      )}
    >
      <button
        onClick={close}
        aria-label="Close panel"
        className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <X className="size-4" />
      </button>
      {children}
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-slate-100 p-4 pr-12', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-slate-900', className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-sm text-slate-500', className)} {...props} />;
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto p-4', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-slate-100 p-4', className)} {...props} />;
}
