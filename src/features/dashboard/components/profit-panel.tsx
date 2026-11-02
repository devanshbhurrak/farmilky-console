import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import type { ProfitData } from '../types';

export function ProfitPanel({ data, loading }: { data: ProfitData | null | undefined; loading?: boolean }) {
  const [range, setRange] = React.useState('today');

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-3 w-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const slice = range === 'month' ? (data?.month ?? {}) : (data?.today ?? {});
  const revenue = Number(slice.revenue ?? 0) || 0;
  const expenses = Number(slice.expenses ?? 0) || 0;
  const profit = Number(slice.profit ?? revenue - expenses) || 0;
  const isLoss = profit < 0;
  const absProfit = Math.abs(profit);
  // Profit margin: profit / revenue * 100.
  const rawMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const marginPct = Math.round(rawMargin);
  const clampedProgress = Math.max(0, Math.min(100, Math.round(Math.abs(rawMargin))));

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Financial Snapshot</CardTitle>
            <p className="text-xs text-slate-500">Revenue, expenses & net profit</p>
          </div>
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="today" className="px-2.5 py-1 text-xs">Today</TabsTrigger>
              <TabsTrigger value="month" className="px-2.5 py-1 text-xs">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {/* Main Profit Display */}
          <div className={`flex items-baseline justify-between rounded-xl p-3 border ${
            isLoss ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`flex size-7 items-center justify-center rounded-lg ${
                isLoss ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isLoss ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
              </span>
              <div>
                <span className="text-xs font-medium text-slate-600 block">
                  {range === 'month' ? 'Month Net Profit' : 'Today Net Profit'}
                </span>
                <span className={`text-lg sm:text-xl font-bold tracking-tight ${
                  isLoss ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {isLoss ? `-${formatCurrency(absProfit)}` : formatCurrency(profit)}
                </span>
              </div>
            </div>

            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isLoss ? 'bg-rose-200/70 text-rose-800' : 'bg-emerald-200/70 text-emerald-800'
            }`}>
              {marginPct}% margin
            </span>
          </div>

          {/* Breakdown breakdown */}
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
              <span className="text-[11px] font-medium text-slate-500 block">Revenue</span>
              <span className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5 block truncate">
                {formatCurrency(revenue)}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
              <span className="text-[11px] font-medium text-slate-500 block">Expenses</span>
              <span className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5 block truncate">
                {formatCurrency(expenses)}
              </span>
            </div>
          </div>

          {/* Margin bar */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Profit Margin</span>
              <span className="font-medium text-slate-700">{marginPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isLoss ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 sm:px-5 flex items-center justify-between text-xs bg-slate-50/50 rounded-b-xl">
        <Link to="/expenses" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900">
          <span>Manage Expenses</span>
          <ArrowUpRight className="size-3" />
        </Link>
        <Link to="/invoices" className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700">
          <span>View Invoices</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
