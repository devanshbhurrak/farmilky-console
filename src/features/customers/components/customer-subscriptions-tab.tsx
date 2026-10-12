import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, getErrorMessage, getId, getName } from '@/lib/utils';
import { useCustomerSubscriptions } from '../hooks';
import type { Subscription } from '@/types/subscription';

function productName(s: Subscription): string {
  return s.productName ?? getName(s.productId);
}

function dailyValue(s: Subscription): number {
  if (s.totalPricePerDay !== undefined && s.totalPricePerDay !== null) return Number(s.totalPricePerDay);
  return Number(s.quantityPerDay ?? 0) * Number(s.pricePerUnit ?? 0);
}

export function CustomerSubscriptionsTab({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useCustomerSubscriptions(userId);

  const columns: Column<Subscription>[] = [
    {
      header: 'Product',
      cell: (s) => (
        <div>
          <Link to={`/subscriptions/${getId(s)}`} className="font-medium text-primary-700 hover:underline">
            {productName(s)}
          </Link>
          <p className="text-xs text-slate-500">
            {s.quantityPerDay} / day{s.slot ? ` · ${s.slot}` : ''}
          </p>
        </div>
      ),
    },
    {
      header: 'Daily value',
      cell: (s) => <span className="font-medium">{formatCurrency(dailyValue(s))}</span>,
    },
    {
      header: 'Status',
      cell: (s) => <StatusBadge status={s.status} />,
    },
    {
      header: 'Details',
      cell: (s) => (
        <Link to={`/subscriptions/${getId(s)}`} className="font-medium text-primary-700 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <DataTable<Subscription>
      data={data ?? []}
      columns={columns}
      keyExtractor={(s, i) => getId(s) || `sub-${i}`}
      loading={isLoading}
      error={error ? getErrorMessage(error) : null}
      onRetry={() => refetch()}
      emptyTitle="No active subscriptions"
      emptyMessage="Subscriptions for this customer will appear here once created."
      renderCard={(s) => (
        <Link
          to={`/subscriptions/${getId(s)}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{productName(s)}</p>
            <p className="text-xs text-slate-500">
              {s.quantityPerDay} / day{s.slot ? ` · ${s.slot}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold">{formatCurrency(dailyValue(s))}</span>
            <StatusBadge status={s.status} />
          </div>
        </Link>
      )}
    />
  );
}
