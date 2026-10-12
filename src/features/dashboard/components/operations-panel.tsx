import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import { unwrapData } from '@/lib/utils';
import type { MilkCollection } from '@/types/supplier';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function extractDeliveryProgress(res: unknown): { done: number; total: number } {
  if (!res) return { done: 0, total: 0 };
  const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
  const obj = (unwrapped && typeof unwrapped === 'object' ? unwrapped : {}) as Record<string, unknown>;
  const summary = (obj.summary ?? obj) as Record<string, unknown>;
  const total = num(summary.scheduled ?? summary.total ?? summary.totalDeliveries ?? 0);
  const done = num(summary.delivered ?? summary.completed ?? summary.done ?? 0);
  return { done, total };
}

export function OperationsPanel({
  deliveryStats,
  shift,
  loading,
}: {
  deliveryStats: unknown;
  shift: MilkCollection[] | null | undefined;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  const { done, total } = extractDeliveryProgress(deliveryStats);
  const deliveryPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const rows = shift ?? [];
  const confirmedCount = rows.filter((c) => c.isConfirmed || String(c.status ?? '').toLowerCase() === 'confirmed').length;
  const liters = rows.reduce((s, c) => s + (num(c.actualQty) || 0), 0);
  const shiftPct = rows.length > 0 ? Math.round((confirmedCount / rows.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Operations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Deliveries</span>
            <span className="font-medium text-slate-900">
              {formatNumber(done)}/{formatNumber(total)} ({deliveryPct}%)
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${deliveryPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Milk collected</span>
            <span className="font-medium text-slate-900">
              {formatNumber(liters)} L · {confirmedCount}/{rows.length} ({shiftPct}%)
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${shiftPct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
