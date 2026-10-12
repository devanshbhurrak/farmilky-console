import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, checked, ...props }, ref) => (
  <span
    className={cn(
      'relative inline-flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
      checked ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white',
      className,
    )}
  >
    <input ref={ref} type="checkbox" checked={checked} className="peer absolute inset-0 cursor-pointer opacity-0" {...props} />
    {checked ? <Check className="size-3.5" aria-hidden /> : null}
  </span>
));
Checkbox.displayName = 'Checkbox';
