import type * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  valueClassName?: string;
  subtitle?: string;
  className?: string;
}

export function StatCard({ label, value, icon, valueClassName, subtitle, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-3 p-4">
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={cn('mt-0.5 text-lg font-semibold text-slate-900 tabular-nums', valueClassName)}>
            {value}
          </p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
