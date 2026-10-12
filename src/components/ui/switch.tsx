import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, checked, ...props }, ref) => (
  <label
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
      checked ? 'bg-primary-600' : 'bg-slate-300',
      className,
    )}
  >
    <input ref={ref} type="checkbox" checked={checked} className="sr-only" {...props} />
    <span
      className={cn(
        'inline-block size-5 transform rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5',
      )}
      style={checked ? { transform: 'translateX(22px)' } : { transform: 'translateX(2px)' }}
    />
  </label>
));
Switch.displayName = 'Switch';
