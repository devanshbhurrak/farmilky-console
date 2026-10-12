import * as React from 'react';
import { cn } from '@/lib/utils';

export function ScrollArea({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('scroll-thin overflow-auto', className)}>{children}</div>;
}
