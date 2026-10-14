import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { todayLocal, unwrapData } from '@/lib/utils';
import {
  useAdminStats,
  useBoardSummary,
  useDeliveryPerformance,
  useDeliveryStats,
  useOpenWork,
  useProfitStats,
  useTodayShift,
  useTodaySupply,
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
  const supplyQuery = useTodaySupply();
  const openWorkQuery = useOpenWork();

  const stats = toStats(statsQuery.data);
  const profit = toProfit(profitQuery.data);
  const pendingDeliveries = boardQuery.data?.remainingDeliveries ?? 0;

  // Surface fetch failures as a warning banner instead of blank cards.
  const failures = [
    statsQuery.isError ? 'overview stats' : null,
    performanceQuery.isError ? 'delivery performance' : null,
    deliveryStatsQuery.isError ? 'delivery stats' : null,
    profitQuery.isError ? 'profit stats' : null,
    shiftQuery.isError ? 'milk collection shift' : null,
    boardQuery.isError ? 'delivery board' : null,
    supplyQuery.isError ? 'supply sheet' : null,
    openWorkQuery.isError ? 'open work queue' : null,
  ].filter((s): s is string => s !== null);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Dashboard" description="Overview of sales, operations and work queues" />

      {failures.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span className="font-semibold">Some dashboard sections failed to load:</span>{' '}
          {failures.join(', ')}. Showing available data — retry in a bit.
        </div>
      )}

      {statsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <MetricCards stats={stats} boardSummary={null} supplyRows={[]} pendingDeliveries={pendingDeliveries} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfitPanel data={profit} loading={profitQuery.isLoading} />
        <OperationsPanel
          deliveryStats={deliveryStatsQuery.data}
          shift={shiftQuery.data ?? null}
          loading={deliveryStatsQuery.isLoading || shiftQuery.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LoadSheet rows={supplyQuery.data?.rows ?? null} loading={supplyQuery.isLoading} />
        <RecentActivity stats={stats} loading={statsQuery.isLoading} />
      </div>

      <PerformancePanel
        performance={performanceQuery.data}
        openComplaints={openWorkQuery.data?.openComplaints ?? 0}
        pendingReturns={openWorkQuery.data?.pendingReturns ?? 0}
        loading={performanceQuery.isLoading || openWorkQuery.isLoading}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">All modules</h2>
        <SectionNavigator />
      </section>
    </div>
  );
}
