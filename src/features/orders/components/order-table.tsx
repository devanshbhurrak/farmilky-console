import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate, getId, getName } from '@/lib/utils';
import type { Order } from '@/types/order';

export function orderCustomerName(order: Order): string {
  if (typeof order.userId === 'object' && order.userId !== null) return order.userId.name;
  return order.customerName ?? getName(order.userId);
}

export function orderStatusOf(order: Order): string {
  return order.orderStatus ?? order.status ?? 'placed';
}

export function OrderCard({ order, onClick }: { order: Order; onClick?: (order: Order) => void }) {
  return (
    <Card
      className="cursor-pointer p-4"
      onClick={() => onClick?.(order)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(order); } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{orderCustomerName(order)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{formatDate(order.orderDate ?? order.createdAt)}</p>
        </div>
        <p className="text-sm font-bold whitespace-nowrap text-slate-900">{formatCurrency(order.totalAmount)}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <StatusBadge status={orderStatusOf(order)} />
        <StatusBadge status={String(order.paymentStatus ?? 'pending')} />
        <span className="sr-only">{getId(order)}</span>
      </div>
    </Card>
  );
}
