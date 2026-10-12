import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info';

const styles: Record<BadgeVariant, string> = {
  default: 'bg-primary-100 text-primary-800',
  secondary: 'bg-slate-100 text-slate-700',
  outline: 'border border-slate-300 text-slate-600',
  success: 'bg-success-bg text-emerald-700',
  warning: 'bg-warning-bg text-amber-700',
  danger: 'bg-danger-bg text-red-700',
  info: 'bg-info-bg text-blue-700',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
