import type * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Pagination } from './pagination';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessor?: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  renderCard?: (item: T) => React.ReactNode;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  skeletonRows?: number;
  className?: string;
}

function cellValue<T>(item: T, accessor?: keyof T | string): React.ReactNode {
  if (!accessor) return null;
  const value = (item as Record<string, unknown>)[accessor as string];
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading,
  error,
  onRetry,
  emptyTitle = 'No results found',
  emptyMessage = 'Try adjusting your search or filters.',
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
  renderCard,
  page,
  totalPages,
  total,
  onPageChange,
  skeletonRows = 5,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn('flex flex-col gap-2', className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={className}>
      {/* Mobile cards */}
      {renderCard && (
        <div className="flex flex-col gap-3 md:hidden">
          {data.map((item, i) => (
            <div key={keyExtractor(item, i)}>{renderCard(item)}</div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div
        className={cn(
          'overflow-x-auto rounded-xl border border-slate-200 bg-white',
          renderCard ? 'hidden md:block' : 'block',
        )}
      >
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className="px-4 py-3 text-xs font-medium tracking-wide text-slate-500 uppercase"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={keyExtractor(item, i)} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60">
                {columns.map((col) => (
                  <td key={col.header} className={cn('px-4 py-3 align-top text-slate-700', col.className)}>
                    {col.cell ? col.cell(item) : cellValue(item, col.accessor)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {page !== undefined && totalPages !== undefined && onPageChange && (
        <Pagination page={page} totalPages={totalPages} total={total} onChange={onPageChange} />
      )}
    </div>
  );
}
