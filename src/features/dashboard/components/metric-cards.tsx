import { IndianRupee, Repeat, ShoppingCart, Truck, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { DashboardStat } from '../types';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function MetricCards({
  stats,
  pendingDeliveries,
}: {
  stats: DashboardStat | null | undefined;
  boardSummary?: { remainingDeliveries: number } | null;
  supplyRows?: unknown[];
  pendingDeliveries?: number;
}) {
  const s = stats ?? {};
  const cards = [
    {
      label: 'Revenue booked',
      value: formatCurrency(num(s.revenueBooked ?? s.revenue ?? s.totalRevenue)),
      icon: <IndianRupee className="size-4" />,
      iconClassName: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: "Today's orders",
      value: formatNumber(num(s.todayOrders ?? s.ordersToday ?? s.orders)),
      icon: <ShoppingCart className="size-4" />,
      iconClassName: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Active subs',
      value: formatNumber(num(s.activeSubscriptions ?? s.activeSubs ?? s.subscriptions)),
      icon: <Repeat className="size-4" />,
      iconClassName: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Pending deliveries',
      value: formatNumber(num(pendingDeliveries ?? s.pendingDeliveries ?? 0)),
      icon: <Truck className="size-4" />,
      iconClassName: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Pending COD',
      value: formatCurrency(num(s.pendingCod ?? s.codPending ?? s.pendingCOD)),
      icon: <Wallet className="size-4" />,
      iconClassName: 'bg-red-50 text-red-600',
    },
    {
      label: 'Total customers',
      value: formatNumber(num(s.totalCustomers ?? s.customers ?? s.totalUsers)),
      icon: <Users className="size-4" />,
      iconClassName: 'bg-slate-100 text-slate-600',
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center gap-2 pb-1">
            <span className={`flex size-8 items-center justify-center rounded-lg ${c.iconClassName}`}>
              {c.icon}
            </span>
            <CardTitle className="text-xs font-medium text-slate-500">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
