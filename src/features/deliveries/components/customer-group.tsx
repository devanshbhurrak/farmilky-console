import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DeliveryBoardEntry } from '@/types/delivery';
import { getId } from '@/lib/utils';

export function entryKeyOf(entry: DeliveryBoardEntry): string {
  return (
    getId(entry) ||
    `${entry.subscriptionId ?? entry.orderId ?? ''}-${entry.productId ?? entry.productName ?? ''}`
  );
}

export interface CustomerGroupData {
  key: string;
  customerName: string;
  phone?: string | null;
  address?: string | null;
  areaName?: string | null;
  lat?: number | null;
  lng?: number | null;
  customerId: string;
  entries: DeliveryBoardEntry[];
}

export function CustomerGroup({
  customerName,
  phone,
  address,
  areaName,
  entries,
}: {
  customerName: string;
  phone?: string | null;
  address?: string | null;
  areaName?: string | null;
  entries: DeliveryBoardEntry[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <header className="flex min-w-0 items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              {customerName.split(' ').map((n) => n[0]).join('')}
            </span>
            <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900 leading-tight">{customerName}</h3>
          </div>
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <Phone className="size-3.5" aria-hidden="true" />
              {phone}
            </a>
          )}
          {address && (
            <div className="mt-0.5 flex items-start gap-1 text-xs text-slate-600">
              <MapPin className="size-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span className="leading-relaxed">{address}</span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-8 px-2 text-xs shrink-0"
        >
          {expanded ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}
        </Button>
      </header>

      {expanded && (
        <div className="flex flex-col gap-2 bg-slate-50/60 p-2.5 sm:p-3">
          {entries.map((entry) => (
            <div key={entryKeyOf(entry)} className="flex min-w-0 items-start justify-between gap-2 px-2 py-1.5 rounded border border-slate-100 bg-white">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-800 truncate">{entry.productName ?? 'Delivery'}</div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="font-semibold">{Number(entry.scheduledQuantity ?? entry.quantity).toFixed(2)}</span>
                  {entry.unit && <span>{entry.unit}</span>}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                {entry.deliveryStatus?.charAt(0).toUpperCase() + entry.deliveryStatus?.slice(1)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
