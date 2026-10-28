import type * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, onChange, className }: PaginationProps) {
  if (totalPages <= 1 && (total ?? 0) === 0) return null;
  const pages = visiblePages(page, totalPages);
  return (
    <div className={cn('flex flex-col items-center gap-2 py-4 sm:flex-row sm:justify-between', className)}>
      <p className="text-xs text-slate-500 text-center sm:text-left w-full sm:w-auto">
        Page {page} of {Math.max(totalPages, 1)}
        {typeof total === 'number' ? ` · ${total} result${total === 1 ? '' : 's'}` : ''}
      </p>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <Button
          variant="outline"
          size="icon"
          aria-label="First page"
          disabled={page <= 1}
          onClick={() => onChange(1)}
          className="min-h-10 min-w-10"
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="min-h-10 min-w-10"
        >
          <ChevronLeft />
        </Button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-slate-400 flex items-center min-h-10">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p as number)}
              className="min-h-10 min-w-10"
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="min-h-10 min-w-10"
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Last page"
          disabled={page >= totalPages}
          onClick={() => onChange(totalPages)}
          className="min-h-10 min-w-10"
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  );
}

function visiblePages(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set<number>([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]);
  const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}
