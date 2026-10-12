import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-800',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
