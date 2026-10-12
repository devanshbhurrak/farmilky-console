import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AreaCustomer } from '@/types/area';

interface AreaCustomerListProps {
  customers: AreaCustomer[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

export function AreaCustomerList({ customers, onMove, onRemove }: AreaCustomerListProps) {
  if (customers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No customers assigned yet. Add customers from the available list.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {customers.map((c, i) => (
        <li
          key={c.customerId || `row-${i}`}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600"
          >
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
              {c.lat != null && c.lng != null && (
                <Badge variant="info">GPS</Badge>
              )}
            </div>
            {c.phone ? <p className="text-xs text-slate-500">{c.phone}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11"
              disabled={i === 0}
              onClick={() => onMove(i, -1)}
              aria-label={`Move ${c.name} up`}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11"
              disabled={i === customers.length - 1}
              onClick={() => onMove(i, 1)}
              aria-label={`Move ${c.name} down`}
            >
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 text-red-600 hover:text-red-700"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${c.name}`}
            >
              <X />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
