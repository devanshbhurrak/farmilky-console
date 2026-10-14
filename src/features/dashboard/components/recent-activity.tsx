import { Repeat, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, shortId } from '@/lib/utils';
import type { DashboardStat } from '../types';

export function RecentActivity({ stats, loading }: { stats: DashboardStat | null | undefined; loading?: boolean }) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  const orders = stats?.recentOrders ?? [];
  const subs = stats?.recentSubscriptions ?? [];
  if (orders.length === 0 && subs.length === 0) {
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
        {orders.slice(0, 5).map((o) => (
          <div key={String(o.id)} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <ShoppingCart className="size-3.5 shrink-0 text-blue-500" />
              <span className="truncate">
                Order {shortId(String(o.id))} · {o.customerName ?? '—'}
              </span>
            </span>
            <span className="text-xs text-slate-500">
              {o.totalAmount != null ? formatCurrency(o.totalAmount) : ''} {o.createdAt ? `· ${formatDate(o.createdAt)}` : ''}
            </span>
          </div>
        ))}
        {subs.slice(0, 5).map((s) => (
          <div key={String(s.id)} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <Repeat className="size-3.5 shrink-0 text-violet-500" />
              <span className="truncate">
                Subscription {shortId(String(s.id))} · {s.customerName ?? '—'}
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
