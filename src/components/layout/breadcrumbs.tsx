import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  path?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-xs text-slate-500 overflow-x-auto pb-1', className)}>
      {items.map((item, i) => (
        <React.Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight className="size-3.5 text-slate-300 shrink-0" aria-hidden />}
          {item.path && i < items.length - 1 ? (
            <Link to={item.path} className="hover:text-primary-700 hover:underline shrink-0 whitespace-nowrap">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-slate-700 shrink-0 whitespace-nowrap">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
