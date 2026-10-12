import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
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
  }, [open ]);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)} className="inline-flex">{trigger}</div>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-1 min-w-44 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-overlay',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ onSelect?: () => void }>, {
                  onSelect: () => setOpen(false),
                })
              : child,
          )}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  onClick,
  className,
  danger,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  onClick?: () => void;
  className?: string;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={() => {
        onClick?.();
        onSelect?.();
      }}
      className={cn(
        'flex min-h-10 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50',
        danger ? 'text-red-600' : 'text-slate-700',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-slate-100" />;
}
