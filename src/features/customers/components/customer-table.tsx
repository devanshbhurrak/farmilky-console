import { ChevronRight, MapPin, Phone } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Customer } from '@/types/customer';

export function customerBalance(c: Customer): number {
  return Number(c.accountBalance ?? c.pendingAmount ?? 0);
}

/** Compact single-line address for a customer's primary address, if any. */
export function customerAddress(c: Customer): string | null {
  const a = c.addresses?.[0];
  if (!a) return null;
  const line = [a.street || a.line1 || a.line2, a.city, a.pincode].filter(Boolean).join(', ');
  return line || null;
}

export function CustomerCard({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen?: (customer: Customer) => void;
}) {
  const balance = customerBalance(customer);
  const address = customerAddress(customer);
  const area = customer.deliveryConfig?.assignedAreaName ?? customer.areaName;
  const open = () => onOpen?.(customer);

  return (
    <Card
      className="group cursor-pointer p-3.5 transition-all duration-150 hover:border-primary-200 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.99]"
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${customer.name}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={customer.name} className="size-11 text-sm shadow-sm ring-2 ring-white" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              {customer.name}
            </p>
            {!customer.isActive && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
                Inactive
              </span>
            )}
          </div>
          {address && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="size-3 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{address}</span>
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge
              variant={balance > 0 ? 'warning' : 'success'}
              className="px-2 py-0.5 text-[11px]"
            >
              {balance > 0 ? `Due ${formatCurrency(balance)}` : 'Clear'}
            </Badge>
            {area && (
              <Badge variant="outline" className="max-w-[8rem] truncate px-2 py-0.5 text-[11px]">
                {area}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Call ${customer.name}`}
              className="flex size-9 items-center justify-center rounded-full bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              <Phone className="size-4" aria-hidden />
            </a>
          )}
          <ChevronRight
            className="size-4 text-slate-300 transition-colors group-hover:text-slate-400"
            aria-hidden
          />
        </div>
      </div>
    </Card>
  );
}
