import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import { normalizeList, unwrapData } from '@/lib/utils';
import type { PerformanceRow } from '../types';

function extractRows(res: unknown, keys: string[]): PerformanceRow[] {
  if (!res) return [];
  const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
  const obj = (unwrapped && typeof unwrapped === 'object' ? unwrapped : {}) as Record<string, unknown>;
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      // /api/admin/delivery-performance returns snake_case rows
      // ({ agent_name, area_name, total_entries, delivered, success_rate });
      // camelCase aliases are kept for payloads that are already normalised.
      return (val as Record<string, unknown>[]).map((r) => ({
        id: r.id != null ? String(r.id) : undefined,
        name: String(r.name ?? r.agent_name ?? r.agentName ?? r.area_name ?? r.areaName ?? '—'),
        delivered: Number(r.delivered ?? 0) || 0,
        total: Number(r.total ?? r.total_entries ?? r.totalEntries ?? r.assigned ?? r.delivered ?? 0) || 0,
        successRate: Number(r.successRate ?? r.success_rate ?? r.rate ?? 0) || 0,
      }));
    }
  }
  const { items } = normalizeList<PerformanceRow>(res, keys);
  return items;
}

function Bars({ rows }: { rows: PerformanceRow[] }) {
  if (rows.length === 0) return <p className="text-xs text-slate-500">No data</p>;
  return (
    <div className="flex flex-col gap-2">
      {rows.slice(0, 6).map((r, i) => {
        const pct = r.total && r.total > 0
          ? Math.round(((r.delivered ?? 0) / r.total) * 100)
          : Math.round(r.successRate ?? 0);
        const clamped = Math.max(0, Math.min(100, pct));
        return (
          <div key={`${r.name}-${i}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{r.name}</span>
              <span className="text-slate-500">
                {formatNumber(r.delivered ?? 0, 0)}/{formatNumber(r.total ?? 0, 0)} · {clamped}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${clamped}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PerformancePanel({
  performance,
  openComplaints,
  pendingReturns,
  loading,
}: {
  performance: unknown;
  openComplaints?: number;
  pendingReturns?: number;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  const agentRows = extractRows(performance, ['agentStats', 'agents']);
  const areaRows = extractRows(performance, ['areaStats', 'areas']);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Delivery performance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
            {openComplaints ?? 0} open complaints
          </span>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-800">
            {pendingReturns ?? 0} pending returns
          </span>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">Agents</p>
          <Bars rows={agentRows} />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">Areas</p>
          <Bars rows={areaRows} />
        </div>
      </CardContent>
    </Card>
  );
}
