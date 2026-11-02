import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { todayLocal, unwrapData } from '@/lib/utils';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { useOrders } from '@/features/orders/hooks';
import { useSubscriptions } from '@/features/subscriptions/hooks';
import {
  useAdminStats,
  useBoardSummary,
  useDeliveryPerformance,
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
  const queryClient = useQueryClient();

  const statsQuery = useAdminStats();
  const performanceQuery = useDeliveryPerformance();
  const profitQuery = useProfitStats();
  const shiftQuery = useTodayShift();
  const boardQuery = useBoardSummary(date);
  const loadSheet = useLoadSheet();
  const openWorkQuery = useOpenWork();
  // Newest 5 orders and subscriptions for the Recent activity card.
  const recentOrdersQuery = useOrders({ limit: 5 });
  const recentSubsQuery = useSubscriptions({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });

  const stats = toStats(statsQuery.data);
  const profit = toProfit(profitQuery.data);

  // Deliveries progress for the Operations panel: today's delivered vs scheduled counts
  const deliveryProgress = stats
    ? {
        scheduled: Number(stats.today_deliveries ?? 0),
        delivered: Number(stats.today_delivered ?? 0),
      }
    : null;

  const pendingDeliveries = boardQuery.data?.remainingDeliveries ?? 0;

  const isRefreshing =
    statsQuery.isRefetching ||
    profitQuery.isRefetching ||
    shiftQuery.isRefetching ||
    boardQuery.isRefetching;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptions', 'today-supply'] });
    queryClient.invalidateQueries({ queryKey: ['milk-collections', 'today-shift'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const refreshAction = useMemo(
    () => (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="h-8 gap-1.5 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        title="Refresh dashboard data"
      >
        <RotateCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    ),
    [handleRefresh, isRefreshing],
  );
  useRegisterHeaderAction(refreshAction);

  // Surface fetch failures as a warning banner
  const failures = [
    statsQuery.isError ? 'overview stats' : null,
    performanceQuery.isError ? 'delivery performance' : null,
    profitQuery.isError ? 'profit stats' : null,
    shiftQuery.isError ? 'milk collection shift' : null,
    boardQuery.isError ? 'delivery board' : null,
    loadSheet.isError ? 'load sheet' : null,
    openWorkQuery.isError ? 'open work queue' : null,
    recentOrdersQuery.isError ? 'recent orders' : null,
    recentSubsQuery.isError ? 'recent subscriptions' : null,
  ].filter((s): s is string => s !== null);

  return (
    <div className="flex flex-col gap-4 sm:gap-5 pb-6">
      <div className="flex items-center justify-between gap-2">
        <PageHeader title="Dashboard" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="hidden sm:inline-flex h-8 gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          title="Refresh dashboard data"
        >
          <RotateCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {failures.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 sm:p-4 text-xs sm:text-sm text-amber-900 shadow-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <span className="font-semibold">Some dashboard sections failed to load:</span>{' '}
              {failures.join(', ')}. Showing available cached data.
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-2 block h-7 px-2.5 text-xs border-amber-300 bg-white hover:bg-amber-100"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top 6 KPI Metric Cards */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <MetricCards stats={stats} pendingDeliveries={pendingDeliveries} />
      )}

      {/* Operations & Profit Snapshot Grid */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <OperationsPanel
          deliveryStats={deliveryProgress}
          shift={shiftQuery.data ?? null}
          loading={statsQuery.isLoading || shiftQuery.isLoading}
        />
        <ProfitPanel data={profit} loading={profitQuery.isLoading} />
      </div>

      {/* Load Sheet & Recent Activity Grid */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <LoadSheet rows={loadSheet.rows} loading={loadSheet.isLoading} />
        <RecentActivity
          orders={recentOrdersQuery.data?.items}
          subscriptions={recentSubsQuery.data?.items}
          loading={recentOrdersQuery.isLoading || recentSubsQuery.isLoading}
        />
      </div>

      {/* Delivery Performance & Open Resolution Queue */}
      <PerformancePanel
        performance={performanceQuery.data}
        openComplaints={openWorkQuery.data?.openComplaints ?? 0}
        pendingReturns={openWorkQuery.data?.pendingReturns ?? 0}
        loading={performanceQuery.isLoading || openWorkQuery.isLoading}
      />

      {/* Fast Shortcuts to all Admin Portals */}
      <section className="pt-1">
        <SectionNavigator />
      </section>
    </div>
  );
}
