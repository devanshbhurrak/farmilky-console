import { Link } from 'react-router-dom';
import { ArrowUpRight, Milk, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import type { TodayShiftSummary } from '@/types/supplier';

interface DeliveryProgress {
  delivered: number;
  scheduled: number;
}

export function OperationsPanel({
  deliveryStats,
  shift,
  loading,
}: {
  deliveryStats: DeliveryProgress | null | undefined;
  shift: TodayShiftSummary | null | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const done = Math.max(0, Number(deliveryStats?.delivered ?? 0));
  const total = Math.max(0, Number(deliveryStats?.scheduled ?? 0));
  const deliveryPct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  const morning = shift?.morning ?? { confirmed: 0, total: 0, qty: 0, amount: 0 };
  const evening = shift?.evening ?? { confirmed: 0, total: 0, qty: 0, amount: 0 };
  const confirmedCount = morning.confirmed + evening.confirmed;
  const totalCount = morning.total + evening.total;
  const liters = morning.qty + evening.qty;
  const shiftPct = totalCount > 0 ? Math.min(100, Math.round((confirmedCount / totalCount) * 100)) : 0;

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Today&apos;s Operations</CardTitle>
            <p className="text-xs text-slate-500">Live dispatch and procurement tracking</p>
          </div>
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" title="Live status" />
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Deliveries Section */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <Truck className="size-3.5" />
                </span>
                <span className="font-medium text-slate-700">Deliveries Completed</span>
              </div>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatNumber(done, 0)} / {formatNumber(total, 0)}{' '}
                <span className="text-xs font-semibold text-blue-600">({deliveryPct}%)</span>
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${deliveryPct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{total - done > 0 ? `${total - done} pending outcome` : 'All deliveries completed'}</span>
              <Link to="/deliveries" className="inline-flex items-center gap-0.5 text-blue-600 font-medium hover:underline">
                <span>Dispatch Board</span>
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* Milk Collection Section */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Milk className="size-3.5" />
                </span>
                <span className="font-medium text-slate-700">Milk Collected</span>
              </div>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatNumber(liters)} L{' '}
                <span className="text-xs font-semibold text-emerald-600">
                  ({confirmedCount}/{totalCount} shifts · {shiftPct}%)
                </span>
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${shiftPct}%` }}
              />
            </div>

            <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-slate-500">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  Morning: <strong>{formatNumber(morning.qty)} L</strong> ({morning.confirmed}/{morning.total})
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-indigo-400" />
                  Evening: <strong>{formatNumber(evening.qty)} L</strong> ({evening.confirmed}/{evening.total})
                </span>
              </div>
              <Link to="/milk-collections" className="inline-flex items-center gap-0.5 text-emerald-600 font-medium hover:underline shrink-0">
                <span>Collections</span>
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 sm:px-5 flex items-center justify-between text-xs bg-slate-50/50 rounded-b-xl">
        <span className="text-slate-500">Updated today</span>
        <Link to="/manifests" className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700">
          <span>View Manifests</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
