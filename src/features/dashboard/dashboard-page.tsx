import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { todayLocal, unwrapData } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { useOrders } from '@/features/orders/hooks';
import { useSubscriptions } from '@/features/subscriptions/hooks';
import {
  useAdminStats,
  useBoardSummary,
  useDeliveryPerformance,
  useDeliveryStats,
  useLoadSheet,
  useOpenWork,
  useProfitStats,
  useTodayShift,
} from './hooks';
import type { DashboardStat, ProfitData } from './types';
import { MetricCards } from './components/metric-cards';
import { ProfitPanel } from './components/profit-panel';
import { OperationsPanel } from './components/operations-panel';
import { LoadSheet } from './components/load-sheet';
import { RecentActivity } from './components/recent-activity';
import { PerformancePanel } from './components/performance-panel';
import { SectionNavigator } from './components/section-navigator';

function toStats(res: unknown): DashboardStat | null {
  if (!res) return null;
  const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
  if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    return unwrapped as DashboardStat;
  }
  return null;
}

function toProfit(res: unknown): ProfitData | null {
  if (!res) return null;
  const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
  if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    return unwrapped as ProfitData;
  }
  return null;
}

export default function DashboardPage() {
  const date = todayLocal();
  const statsQuery = useAdminStats();
  const performanceQuery = useDeliveryPerformance();
  const deliveryStatsQuery = useDeliveryStats();
  const profitQuery = useProfitStats();
  const shiftQuery = useTodayShift();
  const boardQuery = useBoardSummary(date);
  const loadSheet = useLoadSheet();
  const openWorkQuery = useOpenWork();
  // Newest 5 of each for the Recent activity card.
  const recentOrdersQuery = useOrders({ limit: 5 });
  const recentSubsQuery = useSubscriptions({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });

  const stats = toStats(statsQuery.data);
  const profit = toProfit(profitQuery.data);
  // Deliveries progress for the Operations panel: today's delivered vs
  // scheduled counts from /api/admin/stats. The /api/admin/delivery-stats
  // endpoint only reports monthly litres and has no denominator, so it cannot
  // drive the done/total progress bar.
  const deliveryProgress = stats
    ? {
        scheduled: Number(stats.today_deliveries ?? 0),
        delivered: Number(stats.today_delivered ?? 0),
      }
    : null;
  const pendingDeliveries = boardQuery.data?.remainingDeliveries ?? 0;

  // Surface fetch failures as a warning banner instead of blank cards.
  const failures = [
    statsQuery.isError ? 'overview stats' : null,
    performanceQuery.isError ? 'delivery performance' : null,
    deliveryStatsQuery.isError ? 'delivery stats' : null,
    profitQuery.isError ? 'profit stats' : null,
    shiftQuery.isError ? 'milk collection shift' : null,
    boardQuery.isError ? 'delivery board' : null,
    loadSheet.isError ? 'supply sheet' : null,
    openWorkQuery.isError ? 'open work queue' : null,
    recentOrdersQuery.isError ? 'recent orders' : null,
    recentSubsQuery.isError ? 'recent subscriptions' : null,
  ].filter((s): s is string => s !== null);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Dashboard" />

      {failures.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>
              <span className="font-semibold">Some dashboard sections failed to load:</span>
              {' '}{failures.join(', ')}. Showing available data — retry in a bit.
            </span>
          </div>
        </div>
      )}

      {statsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <MetricCards stats={stats} pendingDeliveries={pendingDeliveries} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfitPanel data={profit} loading={profitQuery.isLoading} />
        <OperationsPanel
          deliveryStats={deliveryProgress}
          shift={shiftQuery.data ?? null}
          loading={statsQuery.isLoading || shiftQuery.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LoadSheet rows={loadSheet.rows} loading={loadSheet.isLoading} />
        <RecentActivity
          orders={recentOrdersQuery.data?.items}
          subscriptions={recentSubsQuery.data?.items}
          loading={recentOrdersQuery.isLoading || recentSubsQuery.isLoading}
        />
      </div>

      <PerformancePanel
        performance={performanceQuery.data}
        openComplaints={openWorkQuery.data?.openComplaints ?? 0}
        pendingReturns={openWorkQuery.data?.pendingReturns ?? 0}
        loading={performanceQuery.isLoading || openWorkQuery.isLoading}
      />

      <section className="flex flex-col gap-3">
        <SectionNavigator />
      </section>
    </div>
  );
}
