import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import type { DeliveryBoardEntry } from '@/types/delivery';

export function DeliveryCard({
  entry,
  onOutcome,
}: {
  entry: DeliveryBoardEntry;
  onOutcome: (entry: DeliveryBoardEntry) => void;
}) {
  const canRecord = entry.canRecordOutcome !== false;
  const qty = entry.actualQuantity ?? entry.scheduledQuantity ?? entry.quantity;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-900">{entry.productName ?? '—'}</span>
          <span className="text-slate-600">
            Scheduled {entry.scheduledQuantity ?? entry.quantity}
            {entry.actualQuantity != null && ` · Actual ${entry.actualQuantity}`} · Qty {qty}
            {entry.unit ? ` ${entry.unit}` : ''}
          </span>
          <StatusBadge status={entry.deliveryStatus} className="self-start" />
        </div>
        <Button
          size="sm"
          disabled={!canRecord}
          onClick={() => onOutcome(entry)}
          className="min-h-11 shrink-0"
        >
          Outcome
        </Button>
      </CardContent>
    </Card>
  );
}
