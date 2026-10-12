import { Phone } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, getId } from '@/lib/utils';
import type { Customer } from '@/types/customer';

export function customerBalance(c: Customer): number {
  return Number(c.accountBalance ?? c.pendingAmount ?? 0);
}

export function CustomerCard({
  customer,
  onCollect,
  onHistory,
  onEdit,
}: {
  customer: Customer;
  onCollect?: (customer: Customer) => void;
  onHistory?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
}) {
  const balance = customerBalance(customer);
  const detailsHandler = onHistory ?? onEdit;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={customer.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{customer.name}</p>
            <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Phone className="size-3" aria-hidden />
            {customer.phone ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={balance > 0 ? 'warning' : 'success'}>{balance > 0 ? `Due ${formatCurrency(balance)}` : 'Clear'}</Badge>
            {customer.deliveryConfig?.assignedAreaName || customer.areaName ? (
              <Badge variant="secondary">{customer.deliveryConfig?.assignedAreaName ?? customer.areaName}</Badge>
            ) : null}
          </div>
        </div>
      </div>
      {(onCollect || detailsHandler) && (
        <div className="mt-3 flex gap-2">
          {onCollect && (
            <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => onCollect(customer)}>
              Collect
            </Button>
          )}
          {detailsHandler && (
            <Button size="sm" variant="secondary" className="min-h-11 flex-1" onClick={() => detailsHandler(customer)}>
              Details
            </Button>
          )}
        </div>
      )}
      <span className="sr-only">{getId(customer)}</span>
    </Card>
  );
}
