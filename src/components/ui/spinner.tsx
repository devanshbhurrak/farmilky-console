import { cn } from '@/lib/utils';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label ?? 'Loading'} className={cn('inline-flex items-center gap-2', className)}>
      <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary-600" aria-hidden />
      {label && <span className="text-sm text-slate-500">{label}</span>}
    </span>
  );
}
