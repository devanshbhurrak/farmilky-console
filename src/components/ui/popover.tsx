import * as React from 'react';
import { cn } from '@/lib/utils';

export function Popover({
  trigger,
  children,
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open ]);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)} className="inline-flex">{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute right-0 z-40 mt-1 min-w-56 animate-fade-in rounded-xl border border-slate-200 bg-white p-3 shadow-overlay',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
