import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, Award, MapPin, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, normalizeList, unwrapData } from '@/lib/utils';
import type { PerformanceRow } from '../types';

function extractRows(res: unknown, keys: string[]): PerformanceRow[] {
  if (!res) return [];
  const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
  const obj = (unwrapped && typeof unwrapped === 'object' ? unwrapped : {}) as Record<string, unknown>;
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return (val as Record<string, unknown>[]).map((r) => ({
        id: r.id != null ? String(r.id) : (r.agent_id != null ? String(r.agent_id) : (r.area_id != null ? String(r.area_id) : undefined)),
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

function Bars({ rows, emptyMessage }: { rows: PerformanceRow[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return <p className="text-xs text-slate-400 py-2 italic">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.slice(0, 5).map((r, i) => {
        const pct = r.total && r.total > 0
          ? Math.round(((r.delivered ?? 0) / r.total) * 100)
          : Math.round(r.successRate ?? 0);
        const clamped = Math.max(0, Math.min(100, pct));
        const isHigh = clamped >= 90;
        const isMed = clamped >= 70 && clamped < 90;

        return (
          <div key={`${r.name}-${i}`} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-800 truncate pr-2 max-w-[65%]" title={r.name}>
                {r.name}
              </span>
              <span className="text-slate-500 tabular-nums font-mono text-[11px] shrink-0">
                {formatNumber(r.delivered ?? 0, 0)}/{formatNumber(r.total ?? 0, 0)}{' '}
                <span className={`font-semibold ${
                  isHigh ? 'text-emerald-700' : isMed ? 'text-blue-700' : 'text-amber-700'
                }`}>
                  ({clamped}%)
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isHigh ? 'bg-emerald-500' : isMed ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${clamped}%` }}
              />
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
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const agentRows = extractRows(performance, ['agentStats', 'agents']);
  const areaRows = extractRows(performance, ['areaStats', 'areas']);
  const complaintsCount = openComplaints ?? 0;
  const returnsCount = pendingReturns ?? 0;

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">
              Delivery Performance & Support Queue
            </CardTitle>
            <p className="text-xs text-slate-500">7-day success rate breakdown & open resolution tickets</p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Quick Support Badges (Touch-friendly clickable links) */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              to="/complaints"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors border ${
                complaintsCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>{complaintsCount}</strong> open complaints
              </span>
              <ChevronSmallRight />
            </Link>

            <Link
              to="/returns"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors border ${
                returnsCount > 0
                  ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Undo2 className="size-3.5 text-blue-600 shrink-0" />
              <span>
                <strong>{returnsCount}</strong> pending returns
              </span>
              <ChevronSmallRight />
            </Link>
          </div>

          {/* Agents and Areas 2-column or stacked layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Award className="size-3.5 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Agents</span>
                </div>
                <Link to="/agents" className="text-[11px] font-medium text-blue-600 hover:underline">
                  View agents
                </Link>
              </div>
              <Bars rows={agentRows} emptyMessage="No agent manifest history for the last 7 days." />
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Areas</span>
                </div>
                <Link to="/areas" className="text-[11px] font-medium text-blue-600 hover:underline">
                  View areas
                </Link>
              </div>
              <Bars rows={areaRows} emptyMessage="No area dispatch history for the last 7 days." />
            </div>
          </div>
        </CardContent>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 sm:px-5 flex items-center justify-between text-xs bg-slate-50/50 rounded-b-xl">
        <span className="text-slate-500">Based on past 7 days manifests</span>
        <Link to="/deliveries" className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700">
          <span>Live Board</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}

function ChevronSmallRight() {
  return (
    <svg className="size-3 text-current opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}
