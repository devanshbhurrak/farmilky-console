import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate, getErrorMessage, getId, getName, shortId } from '@/lib/utils';
import { useCustomerOrders } from '../hooks';
import type { Order } from '@/types/order';

function orderCustomerName(order: Order): string {
  if (typeof order.userId === 'object' && order.userId !== null) return order.userId.name;
  return order.customerName ?? getName(order.userId);
}

function orderAmount(order: Order): number {
  return Number(order.totalAmount ?? 0);
}

function orderStatus(order: Order): string {
  return order.orderStatus ?? order.status ?? 'placed';
}

export function CustomerOrdersTab({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useCustomerOrders(userId);

  const columns: Column<Order>[] = [
    {
      header: 'Order',
      cell: (o) => (
        <Link to={`/orders/${getId(o)}`} className="font-medium text-primary-700 hover:underline">
          {shortId(getId(o))}
        </Link>
      ),
    },
    {
      header: 'Date',
      cell: (o) => <span className="whitespace-nowrap">{formatDate(o.orderDate ?? o.createdAt)}</span>,
    },
    {
      header: 'Amount',
      cell: (o) => <span className="font-medium">{formatCurrency(orderAmount(o))}</span>,
    },
    {
      header: 'Status',
      cell: (o) => <StatusBadge status={orderStatus(o)} />,
    },
    {
      header: 'Details',
      cell: (o) => (
        <Link to={`/orders/${getId(o)}`} className="font-medium text-primary-700 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <DataTable<Order>
      data={data ?? []}
      columns={columns}
      keyExtractor={(o, i) => getId(o) || `order-${i}`}
      loading={isLoading}
      error={error ? getErrorMessage(error) : null}
      onRetry={() => refetch()}
      emptyTitle="No orders yet"
      emptyMessage="Orders placed by this customer will appear here."
      renderCard={(o) => (
        <Link
          to={`/orders/${getId(o)}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{shortId(getId(o))}</p>
            <p className="text-xs text-slate-500">
              {formatDate(o.orderDate ?? o.createdAt)} · {orderCustomerName(o)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold">{formatCurrency(orderAmount(o))}</span>
            <StatusBadge status={orderStatus(o)} />
          </div>
        </Link>
      )}
    />
  );
}
