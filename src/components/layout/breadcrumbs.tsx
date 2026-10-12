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
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-xs text-slate-500', className)}>
      {items.map((item, i) => (
        <React.Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight className="size-3.5 text-slate-300" aria-hidden />}
          {item.path && i < items.length - 1 ? (
            <Link to={item.path} className="hover:text-primary-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-slate-700">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
