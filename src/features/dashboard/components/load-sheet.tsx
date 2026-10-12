import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { SupplyRow } from '../types';

export function LoadSheet({ rows, loading }: { rows: SupplyRow[] | null | undefined; loading?: boolean }) {
  if (loading) return <Skeleton className="h-44 w-full" />;
  const list = rows ?? [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Today&apos;s load sheet</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">No supply data for today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Customers</th>
                  <th className="py-2 pr-3 font-medium">Liters</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={`${String(r.product ?? r.productName ?? i)}-${i}`} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-900">{String(r.product ?? r.productName ?? '—')}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatNumber(r.customers ?? 0, 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatNumber(r.liters ?? 0)}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatNumber(r.qty ?? r.quantity ?? 0, 0)}</td>
                    <td className="py-2 text-slate-600">{formatCurrency(r.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
