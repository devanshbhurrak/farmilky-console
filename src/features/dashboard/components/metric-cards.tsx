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
    { label: 'Revenue booked', value: formatCurrency(num(s.revenueBooked ?? s.revenue ?? s.totalRevenue)) },
    { label: "Today's orders", value: formatNumber(num(s.todayOrders ?? s.ordersToday ?? s.orders)) },
    { label: 'Active subs', value: formatNumber(num(s.activeSubscriptions ?? s.activeSubs ?? s.subscriptions)) },
    { label: 'Pending deliveries', value: formatNumber(num(pendingDeliveries ?? s.pendingDeliveries ?? 0)) },
    { label: 'Pending COD', value: formatCurrency(num(s.pendingCod ?? s.codPending ?? s.pendingCOD)) },
    { label: 'Total customers', value: formatNumber(num(s.totalCustomers ?? s.customers ?? s.totalUsers)) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-1">
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
