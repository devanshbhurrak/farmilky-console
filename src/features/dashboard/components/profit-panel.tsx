import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import type { ProfitData } from '../types';

export function ProfitPanel({ data, loading }: { data: ProfitData | null | undefined; loading?: boolean }) {
  const [range, setRange] = React.useState('today');
  if (loading) return <Skeleton className="h-44 w-full" />;
  const slice = range === 'month' ? (data?.month ?? {}) : (data?.today ?? {});
  const revenue = Number(slice.revenue ?? 0) || 0;
  const expenses = Number(slice.expenses ?? 0) || 0;
  const profit = Number(slice.profit ?? revenue - expenses) || 0;
  const margin = revenue > 0 ? Math.max(0, Math.min(100, (profit / revenue) * 100)) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm">Profit</CardTitle>
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Revenue</span>
          <span className="font-medium text-slate-900">{formatCurrency(revenue)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Expenses</span>
          <span className="font-medium text-slate-900">{formatCurrency(expenses)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Profit</span>
          <span className={`font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(profit)}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" title={`Margin ${Math.round(margin)}%`}>
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${margin}%` }} />
        </div>
        <p className="text-xs text-slate-500">{Math.round(margin)}% margin</p>
      </CardContent>
    </Card>
  );
}
