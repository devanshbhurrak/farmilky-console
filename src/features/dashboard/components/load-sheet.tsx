import { Link } from 'react-router-dom';
import { ArrowUpRight, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { SupplyRow } from '../types';

export function LoadSheet({ rows, loading }: { rows: SupplyRow[] | null | undefined; loading?: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const list = rows ?? [];
  const totalLiters = list.reduce((sum, r) => sum + (Number(r.liters) || 0), 0);
  const totalAmount = list.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalDeliveries = list.reduce((sum, r) => sum + (Number(r.qty ?? r.quantity) || 0), 0);

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Today&apos;s Load Sheet</CardTitle>
            <p className="text-xs text-slate-500">Scheduled supply aggregated by product</p>
          </div>
          {list.length > 0 && (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              {formatNumber(totalLiters)} L total
            </span>
          )}
        </CardHeader>

        <CardContent>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                <Package className="size-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">No supply data for today</p>
              <p className="text-xs text-slate-400 mt-0.5">No subscription deliveries are scheduled for this date.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card-List Layout (< 640px) */}
              <div className="flex flex-col gap-2.5 sm:hidden">
                {list.map((r, i) => (
                  <div
                    key={`${String(r.product ?? r.productName ?? i)}-${i}`}
                    className="flex flex-col gap-1.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {String(r.product ?? r.productName ?? '—')}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">
                        {formatCurrency(r.amount ?? 0)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Customers</span>
                        <span className="font-medium text-slate-700">{formatNumber(r.customers ?? 0, 0)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Volume</span>
                        <span className="font-medium text-slate-700">{formatNumber(r.liters ?? 0)} L</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Units / Qty</span>
                        <span className="font-medium text-slate-700">{formatNumber(r.qty ?? r.quantity ?? 0, 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop Table Layout (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                      <th className="py-2.5 pr-3 font-semibold">Product</th>
                      <th className="py-2.5 pr-3 font-semibold text-right">Customers</th>
                      <th className="py-2.5 pr-3 font-semibold text-right">Volume</th>
                      <th className="py-2.5 pr-3 font-semibold text-right">Qty</th>
                      <th className="py-2.5 font-semibold text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((r, i) => (
                      <tr key={`${String(r.product ?? r.productName ?? i)}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 pr-3 font-medium text-slate-900">{String(r.product ?? r.productName ?? '—')}</td>
                        <td className="py-2.5 pr-3 text-right text-slate-600">{formatNumber(r.customers ?? 0, 0)}</td>
                        <td className="py-2.5 pr-3 text-right text-slate-600 font-mono">{formatNumber(r.liters ?? 0)} L</td>
                        <td className="py-2.5 pr-3 text-right text-slate-600">{formatNumber(r.qty ?? r.quantity ?? 0, 0)}</td>
                        <td className="py-2.5 text-right font-medium text-slate-900">{formatCurrency(r.amount ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50">
                      <td className="py-2 pr-3">Total</td>
                      <td className="py-2 pr-3 text-right">—</td>
                      <td className="py-2 pr-3 text-right font-mono">{formatNumber(totalLiters)} L</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(totalDeliveries, 0)}</td>
                      <td className="py-2 text-right text-emerald-700">{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 sm:px-5 flex items-center justify-between text-xs bg-slate-50/50 rounded-b-xl">
        <Link to="/products" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900">
          <span>Product Catalog</span>
          <ArrowUpRight className="size-3" />
        </Link>
        <Link to="/deliveries" className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700">
          <span>Go to Delivery Board</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
