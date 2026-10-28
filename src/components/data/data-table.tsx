import type * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Pagination } from './pagination';
import { Card } from '@/components/ui/card';
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

function getColSkeletonWidth(colIdx: number, total: number): number {
  if (colIdx === 0) return 30;
  if (colIdx === total - 1) return 15;
  return colIdx % 2 === 0 ? 25 : 20;
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
      <div className={cn('overflow-x-auto rounded-xl border border-slate-200 bg-white', className)} aria-busy="true" aria-label="Loading">
        {/* Header row */}
        <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
          {columns.map((_, i) => (
            <Skeleton key={i} className="h-3 rounded" style={{ width: `${getColSkeletonWidth(i, columns.length)}%` }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: skeletonRows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0">
            {columns.map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4 rounded" style={{ width: `${getColSkeletonWidth(colIdx, columns.length)}%` }} />
            ))}
          </div>
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

  const visibleColumns = columns.filter((col) => !col.hideOnMobile);
  const desktopColumns = columns;

  return (
    <div className={cn('flex flex-1 flex-col', className)}>
      {/* Mobile cards */}
      {renderCard && (
        <div className="flex flex-col gap-3 md:hidden">
          {data.map((item, i) => (
            <Card key={keyExtractor(item, i)} className="p-4">
              {renderCard(item)}
            </Card>
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
              {desktopColumns.map((col) => (
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
                {desktopColumns.map((col) => (
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
        <div className="mt-4 pt-4 border-t border-slate-100 md:mt-0 md:border-t-0 md:pt-0">
          <Pagination page={page} totalPages={totalPages} total={total} onChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
