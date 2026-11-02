import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Clock, Repeat, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate, shortId } from '@/lib/utils';

export interface RecentOrder {
  id?: string;
  customerName?: string;
  totalAmount?: number;
  orderStatus?: string;
  status?: string;
  createdAt?: string | null;
}

export interface RecentSubscription {
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
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const orderList = orders ?? [];
  const subList = subscriptions ?? [];

  if (orderList.length === 0 && subList.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Recent Activity</CardTitle>
          <p className="text-xs text-slate-500">Latest orders and new subscriptions</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
              <Clock className="size-5" />
            </span>
            <p className="text-sm font-medium text-slate-700">No recent activity</p>
            <p className="text-xs text-slate-400 mt-0.5">New orders and subscriptions will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Recent Activity</CardTitle>
            <p className="text-xs text-slate-500">Latest customer orders and subscriptions</p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {/* Recent Orders List */}
          {orderList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  Latest Orders
                </span>
                <Link to="/orders" className="text-xs font-medium text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="flex flex-col gap-1.5">
                {orderList.slice(0, 4).map((o, i) => {
                  const orderId = String(o.id ?? i);
                  const st = o.orderStatus ?? o.status;
                  return (
                    <Link
                      key={`order-${orderId}`}
                      to={o.id ? `/orders/${o.id}` : '/orders'}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                          <ShoppingCart className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate">
                              {o.id ? shortId(orderId) : 'Order'}
                            </span>
                            {st && <StatusBadge status={st} className="text-[9px] py-0 px-1.5 h-4" />}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {o.customerName || 'Customer'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {o.totalAmount != null ? formatCurrency(o.totalAmount) : '—'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {o.createdAt ? formatDate(o.createdAt) : ''}
                          </p>
                        </div>
                        <ChevronRight className="size-3.5 text-slate-300 group-hover:text-slate-600" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Subscriptions List */}
          {subList.length > 0 && (
            <div className={orderList.length > 0 ? 'pt-2' : ''}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  Latest Subscriptions
                </span>
                <Link to="/subscriptions" className="text-xs font-medium text-violet-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="flex flex-col gap-1.5">
                {subList.slice(0, 4).map((s, i) => {
                  const subId = String(s.id ?? i);
                  return (
                    <Link
                      key={`sub-${subId}`}
                      to={s.id ? `/subscriptions/${s.id}` : '/subscriptions'}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                          <Repeat className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 group-hover:text-violet-600 truncate">
                              {s.id ? shortId(subId) : 'Subscription'}
                            </span>
                            {s.status && <StatusBadge status={s.status} className="text-[9px] py-0 px-1.5 h-4" />}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {s.customerName || 'Subscriber'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <div>
                          <p className="text-[10px] text-slate-400">
                            {s.createdAt ? formatDate(s.createdAt) : ''}
                          </p>
                        </div>
                        <ChevronRight className="size-3.5 text-slate-300 group-hover:text-slate-600" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 sm:px-5 flex items-center justify-between text-xs bg-slate-50/50 rounded-b-xl">
        <Link to="/orders" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900">
          <span>All Orders</span>
          <ArrowUpRight className="size-3" />
        </Link>
        <Link to="/subscriptions" className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700">
          <span>All Subscriptions</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
