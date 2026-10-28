import { Repeat, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, shortId } from '@/lib/utils';

/** Subset of an order the panel renders (from GET /api/orders/admin/all). */
interface RecentOrder {
  id?: string;
  customerName?: string;
  totalAmount?: number;
  createdAt?: string | null;
}

/** Subset of a subscription the panel renders (from the admin list endpoint). */
interface RecentSubscription {
  id?: string;
  customerName?: string;
  status?: string | null;
  createdAt?: string | null;
}

export function RecentActivity({
  orders,
  subscriptions,
  loading,
}: {
  orders?: RecentOrder[] | null;
  subscriptions?: RecentSubscription[] | null;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  const orderList = orders ?? [];
  const subList = subscriptions ?? [];
  if (orderList.length === 0 && subList.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No recent activity.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {orderList.length > 0 && (
          <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Orders</p>
        )}
        {orderList.slice(0, 5).map((o, i) => (
          <div key={String(o.id ?? i)} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <ShoppingCart className="size-3.5 shrink-0 text-blue-500" />
              <span className="truncate">
                Order {o.id ? shortId(String(o.id)) : '—'} · {o.customerName ?? '—'}
              </span>
            </span>
            <span className="text-xs text-slate-500">
              {o.totalAmount != null ? formatCurrency(o.totalAmount) : ''} {o.createdAt ? `· ${formatDate(o.createdAt)}` : ''}
            </span>
          </div>
        ))}
        {orderList.length > 0 && subList.length > 0 && <div className="my-2 h-px bg-slate-100" />}
        {subList.length > 0 && (
          <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Subscriptions</p>
        )}
        {subList.slice(0, 5).map((s, i) => (
          <div key={String(s.id ?? i)} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <Repeat className="size-3.5 shrink-0 text-violet-500" />
              <span className="truncate">
                Subscription {s.id ? shortId(String(s.id)) : '—'} · {s.customerName ?? '—'}
              </span>
            </span>
            <span className="text-xs text-slate-500">
              {String(s.status ?? '')} {s.createdAt ? `· ${formatDate(s.createdAt)}` : ''}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
