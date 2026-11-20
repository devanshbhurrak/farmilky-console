
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { Skeleton } from '@/components/ui/skeleton';
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

  const unwrapped = unwrapData<unknown>(
    res as { success?: boolean; data?: unknown },
  );

  if (
    unwrapped &&
    typeof unwrapped === 'object' &&
    !Array.isArray(unwrapped)
  ) {
    return unwrapped as DashboardStat;
  }

  return null;
}

function toProfit(res: unknown): ProfitData | null {
  if (!res) return null;

  const unwrapped = unwrapData<unknown>(
    res as { success?: boolean; data?: unknown },
  );

  if (
    unwrapped &&
    typeof unwrapped === 'object' &&
    !Array.isArray(unwrapped)
  ) {
    return unwrapped as ProfitData;
  }

  return null;
}

function toSafeCount(value: unknown): number {
  const count = Number(value);

  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

export default function DashboardPage() {
  const date = todayLocal();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Dashboard queries
  const statsQuery = useAdminStats();
  const performanceQuery = useDeliveryPerformance();
  const profitQuery = useProfitStats();
  const shiftQuery = useTodayShift();
  const boardQuery = useBoardSummary(date);
  const loadSheetQuery = useLoadSheet();
  const openWorkQuery = useOpenWork();

  // Recent activity
  const recentOrdersQuery = useOrders({ limit: 5 });
  const recentSubsQuery = useSubscriptions({
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Normalize API responses
  const stats = toStats(statsQuery.data);
  const profit = toProfit(profitQuery.data);

  // Delivery progress
  const deliveryProgress = stats
    ? {
        scheduled: toSafeCount(stats.today_deliveries),
        delivered: toSafeCount(stats.today_delivered),
      }
    : null;

  const pendingDeliveries = toSafeCount(
    boardQuery.data?.remainingDeliveries,
  );

  // Refresh state includes background refetches as well as manual refreshes.
  const isRefreshing =
    isManualRefreshing ||
    statsQuery.isRefetching ||
    performanceQuery.isRefetching ||
    profitQuery.isRefetching ||
    shiftQuery.isRefetching ||
    boardQuery.isRefetching ||
    loadSheetQuery.isRefetching ||
    openWorkQuery.isRefetching ||
    recentOrdersQuery.isRefetching ||
    recentSubsQuery.isRefetching;

  /**
   * Refetch every query used on this page.
   * This avoids relying on query-key assumptions and ensures that
   * sections such as performance, load sheet, and recent activity refresh too.
   */
  const handleRefresh = useCallback(async () => {
    if (isManualRefreshing) return;

    setIsManualRefreshing(true);

    try {
      await Promise.allSettled([
        statsQuery.refetch({ throwOnError: true }),
        performanceQuery.refetch({ throwOnError: true }),
        profitQuery.refetch({ throwOnError: true }),
        shiftQuery.refetch({ throwOnError: true }),
        boardQuery.refetch({ throwOnError: true }),
        loadSheetQuery.refetch({ throwOnError: true }),
        openWorkQuery.refetch({ throwOnError: true }),
        recentOrdersQuery.refetch({ throwOnError: true }),
        recentSubsQuery.refetch({ throwOnError: true }),
      ]);
    } finally {
      setIsManualRefreshing(false);
    }
  }, [
    isManualRefreshing,
    statsQuery.refetch,
    performanceQuery.refetch,
    profitQuery.refetch,
    shiftQuery.refetch,
    boardQuery.refetch,
    loadSheetQuery.refetch,
    openWorkQuery.refetch,
    recentOrdersQuery.refetch,
    recentSubsQuery.refetch,
  ]);

  // Register the refresh action for the responsive application header.
  const refreshAction = useMemo(
    () => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleRefresh()}
        disabled={isRefreshing}
        aria-label="Refresh dashboard data"
        title="Refresh dashboard data"
        className="h-8 gap-1.5 px-2.5 text-xs font-medium"
      >
        <RotateCw
          className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
        />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    ),
    [handleRefresh, isRefreshing],
  );

  useRegisterHeaderAction(refreshAction);

  // Track individual section failures.
  const failures = [
    { label: 'Overview stats', failed: statsQuery.isError },
    { label: 'Delivery performance', failed: performanceQuery.isError },
    { label: 'Profit stats', failed: profitQuery.isError },
    { label: 'Milk collection shift', failed: shiftQuery.isError },
    { label: 'Delivery board', failed: boardQuery.isError },
    { label: 'Load sheet', failed: loadSheetQuery.isError },
    { label: 'Open work queue', failed: openWorkQuery.isError },
    { label: 'Recent orders', failed: recentOrdersQuery.isError },
    { label: 'Recent subscriptions', failed: recentSubsQuery.isError },
  ]
    .filter((item) => item.failed)
    .map((item) => item.label);

  return (
    <main className="flex w-full min-w-0 flex-col gap-4 pb-6 sm:gap-5">
    

      {/* Partial data loading warning */}
      {failures.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-amber-950 shadow-sm sm:p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />

              <div className="min-w-0 text-xs sm:text-sm">
                <p className="font-semibold">
                  Some dashboard sections failed to load.
                </p>

                <p className="mt-1 break-words leading-relaxed text-amber-900">
                  {failures.join(', ')}. Available data is still shown where
                  possible.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="h-8 w-full shrink-0 gap-1.5 border-amber-300 bg-white px-3 text-xs hover:bg-amber-100 sm:w-auto"
            >
              <RotateCw
                className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* KPI metric cards */}
      <section aria-label="Dashboard overview" className="min-w-0">
        {statsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-24 w-full rounded-xl sm:h-28"
              />
            ))}
          </div>
        ) : (
          <MetricCards
            stats={stats}
            pendingDeliveries={pendingDeliveries}
          />
        )}
      </section>

      {/* Operations and profit snapshot */}
      <section
        aria-label="Operations and profit"
        className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2"
      >
        <div className="min-w-0">
          <OperationsPanel
            deliveryStats={deliveryProgress}
            shift={shiftQuery.data ?? null}
            loading={statsQuery.isLoading || shiftQuery.isLoading}
          />
        </div>

        <div className="min-w-0">
          <ProfitPanel
            data={profit}
            loading={profitQuery.isLoading}
          />
        </div>
      </section>

      {/* Load sheet and recent activity */}
      <section
        aria-label="Load sheet and recent activity"
        className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2"
      >
        <div className="min-w-0">
          <LoadSheet
            rows={loadSheetQuery.rows}
            loading={loadSheetQuery.isLoading}
          />
        </div>

        <div className="min-w-0">
          <RecentActivity
            orders={recentOrdersQuery.data?.items}
            subscriptions={recentSubsQuery.data?.items}
            loading={
              recentOrdersQuery.isLoading ||
              recentSubsQuery.isLoading
            }
          />
        </div>
      </section>

      {/* Delivery performance and open resolution queue */}
      <section aria-label="Delivery performance" className="min-w-0">
        <PerformancePanel
          performance={performanceQuery.data}
          openComplaints={openWorkQuery.data?.openComplaints ?? 0}
          pendingReturns={openWorkQuery.data?.pendingReturns ?? 0}
          loading={
            performanceQuery.isLoading ||
            openWorkQuery.isLoading
          }
        />
      </section>

      {/* Navigation shortcuts */}
      <section
        aria-label="Admin portal navigation"
        className="min-w-0 pt-1"
      >
        <SectionNavigator />
      </section>
    </main>
  );
}
