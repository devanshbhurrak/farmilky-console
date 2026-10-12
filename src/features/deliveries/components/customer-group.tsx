import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Phone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DeliveryBoardEntry } from '@/types/delivery';
import { getId } from '@/lib/utils';
import { DeliveryCard } from './delivery-card';

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
  onOutcome,
  onConfirmAll,
  onAddExtra,
  selectedIds,
  onToggleSelect,
  confirming,
}: {
  customerName: string;
  phone?: string | null;
  address?: string | null;
  areaName?: string | null;
  entries: DeliveryBoardEntry[];
  onOutcome: (entry: DeliveryBoardEntry) => void;
  onConfirmAll: () => void;
  onAddExtra?: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string, checked: boolean) => void;
  confirming?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const pendingCount = entries.filter(
    (e) => (e.deliveryStatus ?? '').toLowerCase() === 'pending',
  ).length;

  const mapsHref =
    address || (entries[0]?.lat != null && entries[0]?.lng != null)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          entries[0]?.lat != null && entries[0]?.lng != null
            ? `${entries[0]?.lat},${entries[0]?.lng}`
            : (address ?? ''),
        )}`
      : null;

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={customerName} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-1 flex-col gap-0.5 text-left"
            aria-expanded={expanded}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {customerName}
              <Badge variant="secondary">{entries.length}</Badge>
              {areaName && <Badge variant="outline">{areaName}</Badge>}
              {expanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 hover:text-primary-700"
                >
                  <Phone className="size-3" /> {phone}
                </a>
              )}
              {address && <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {address}</span>}
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary-700 hover:underline"
                >
                  Navigate
                </a>
              )}
            </span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            loading={confirming}
            disabled={pendingCount === 0}
            onClick={onConfirmAll}
            className="min-h-11"
          >
            Confirm all ({pendingCount})
          </Button>
          {onAddExtra && (
            <Button size="sm" variant="outline" onClick={onAddExtra} className="min-h-11">
              <Plus /> Extra
            </Button>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="flex flex-col gap-2 p-4 pt-0">
          {entries.map((entry) => {
            const eid = entryKeyOf(entry);
            const checked = selectedIds.includes(eid);
            return (
              <div key={eid} className="flex items-start gap-2">
                <Checkbox
                  checked={checked}
                  onChange={(e) => onToggleSelect(eid, e.target.checked)}
                  aria-label={`Select delivery ${entry.productName ?? ''}`}
                  className="mt-4"
                />
                <div className="flex-1">
                  <DeliveryCard entry={entry} onOutcome={onOutcome} />
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
