import { cn } from '@/lib/utils';

export function Separator({ className }: { className?: string }) {
  return <div className={cn('border-t border-slate-200', className)} aria-hidden />;
}
