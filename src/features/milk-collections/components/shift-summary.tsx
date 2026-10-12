import type { MilkCollection } from '@/types/supplier';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function isConfirmed(c: MilkCollection): boolean {
  if (c.isConfirmed === true) return true;
  return String(c.status ?? '').toLowerCase() === 'confirmed';
}

export function ShiftSummary({ collections }: { collections: MilkCollection[] }) {
  const total = collections.length;
  const confirmed = collections.filter(isConfirmed);
  const liters = collections.reduce((sum, c) => sum + (Number(c.actualQty ?? 0) || 0), 0);
  const amount = collections.reduce((sum, c) => sum + (Number(c.amount ?? 0) || 0), 0);
  const fatValues = collections.map((c) => Number(c.fatContent)).filter((n) => !Number.isNaN(n) && n > 0);
  const snfValues = collections.map((c) => Number(c.snf)).filter((n) => !Number.isNaN(n) && n > 0);
  const avgFat = fatValues.length > 0 ? fatValues.reduce((a, b) => a + b, 0) / fatValues.length : 0;
  const avgSnf = snfValues.length > 0 ? snfValues.reduce((a, b) => a + b, 0) / snfValues.length : 0;

  const sessions: Record<string, { count: number; liters: number }> = {};
  for (const c of collections) {
    const key = String(c.session ?? 'unknown');
    if (!sessions[key]) sessions[key] = { count: 0, liters: 0 };
    sessions[key].count += 1;
    sessions[key].liters += Number(c.actualQty ?? 0) || 0;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-slate-500">Milk collected</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold text-slate-900">{formatNumber(liters)} L</p>
          <p className="text-xs text-slate-500">{formatCurrency(amount)} value</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-slate-500">Confirmed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold text-slate-900">
            {confirmed.length}/{total}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${total > 0 ? Math.round((confirmed.length / total) * 100) : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-slate-500">Avg quality</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold text-slate-900">{formatNumber(avgFat)} % fat</p>
          <p className="text-xs text-slate-500">{formatNumber(avgSnf)} SNF</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-medium text-slate-500">Sessions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {Object.entries(sessions).length === 0 && <p className="text-xs text-slate-500">No data</p>}
          {Object.entries(sessions).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-600 capitalize">{key}</span>
              <span className="text-slate-500">
                {value.count} · {formatNumber(value.liters)} L
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
