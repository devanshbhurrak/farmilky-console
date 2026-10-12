import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Pagination } from './pagination';

interface DataListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T) => React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export function DataList<T>({
  data,
  keyExtractor,
  renderItem,
  loading,
  error,
  onRetry,
  emptyTitle = 'No results found',
  emptyMessage = 'Try adjusting your search or filters.',
  emptyActionLabel,
  onEmptyAction,
  page,
  totalPages,
  total,
  onPageChange,
}: DataListProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} actionLabel={emptyActionLabel} onAction={onEmptyAction} />;
  }
  return (
    <div>
      <div className="flex flex-col gap-3">
        {data.map((item, i) => (
          <div key={keyExtractor(item, i)}>{renderItem(item)}</div>
        ))}
      </div>
      {page !== undefined && totalPages !== undefined && onPageChange && (
        <Pagination page={page} totalPages={totalPages} total={total} onChange={onPageChange} />
      )}
    </div>
  );
}
