import { Link } from 'react-router-dom';
import { ChevronRight, IndianRupee, Repeat, ShoppingCart, Truck, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { DashboardStat } from '../types';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * /api/admin/stats returns snake_case keys (see backend StatsRow).
 * Each metric is a clickable link routing directly to its management page.
 */
export function MetricCards({
  stats,
  pendingDeliveries,
}: {
  stats: DashboardStat | null | undefined;
  pendingDeliveries?: number;
}) {
  const s = stats ?? {};
  const cards = [
    {
      label: 'Revenue booked',
      value: formatCurrency(num(s.total_revenue ?? s.revenueBooked ?? s.revenue ?? s.totalRevenue)),
      icon: <IndianRupee className="size-4" />,
      iconClassName: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      href: '/invoices',
      subtext: 'All-time debits',
    },
    {
      label: 'Total orders',
      value: formatNumber(num(s.total_orders ?? s.todayOrders ?? s.ordersToday ?? s.orders)),
      icon: <ShoppingCart className="size-4" />,
      iconClassName: 'bg-blue-50 text-blue-600 border border-blue-100',
      href: '/orders',
      subtext: 'Active & completed',
    },
    {
      label: 'Active subs',
      value: formatNumber(num(s.active_subscriptions ?? s.activeSubscriptions ?? s.activeSubs ?? s.subscriptions)),
      icon: <Repeat className="size-4" />,
      iconClassName: 'bg-violet-50 text-violet-600 border border-violet-100',
      href: '/subscriptions',
      subtext: 'Active schedules',
    },
    {
      label: 'Pending deliveries',
      value: formatNumber(num(pendingDeliveries ?? s.pendingDeliveries ?? 0)),
      icon: <Truck className="size-4" />,
      iconClassName: 'bg-amber-50 text-amber-600 border border-amber-100',
      href: '/deliveries',
      subtext: 'Today awaiting outcome',
    },
    {
      label: 'Pending COD',
      value: formatCurrency(num(s.pending_amount ?? s.pendingCod ?? s.codPending ?? s.pendingCOD)),
      icon: <Wallet className="size-4" />,
      iconClassName: 'bg-rose-50 text-rose-600 border border-rose-100',
      href: '/balances',
      subtext: s.pending_payments != null ? `${formatNumber(num(s.pending_payments))} customers` : 'Outstanding balance',
    },
    {
      label: 'Total customers',
      value: formatNumber(num(s.total_customers ?? s.totalCustomers ?? s.customers ?? s.totalUsers)),
      icon: <Users className="size-4" />,
      iconClassName: 'bg-slate-100 text-slate-600 border border-slate-200',
      href: '/customers',
      subtext: 'Registered customers',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
      {cards.map((c) => (
        <Link
          key={c.label}
          to={c.href}
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <Card className="h-full transition-all duration-150 group-hover:border-slate-300 group-hover:shadow-md active:scale-[0.98]">
            <CardContent className="flex flex-col justify-between p-3 sm:p-4">
              <div className="flex items-center justify-between gap-1.5 pb-2">
                <span className={`flex size-7 sm:size-8 items-center justify-center rounded-lg ${c.iconClassName}`}>
                  {c.icon}
                </span>
                <ChevronRight className="size-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate" title={c.label}>
                  {c.label}
                </p>
                <p className="mt-0.5 text-base sm:text-lg lg:text-xl font-bold tracking-tight text-slate-900 truncate">
                  {c.value}
                </p>
                <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400 truncate">
                  {c.subtext}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
