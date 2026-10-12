import { Sheet, SheetBody, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { DeliveryBoardEntry } from '@/types/delivery';
import { useRecordOutcome } from '../hooks';
import type { DeliveryOutcomeInput } from '../schemas';
import { OutcomeForm } from './outcome-form';

export interface EntryTarget {
  kind: 'subscription' | 'order';
  id: string;
}

export function resolveTarget(entry: DeliveryBoardEntry): EntryTarget {
  const kind: 'subscription' | 'order' = entry.type === 'order' ? 'order' : 'subscription';
  if (kind === 'order') {
    return { kind, id: entry.orderId ?? entry.id };
  }
  return { kind, id: entry.subscriptionId ?? entry.id };
}

export function OutcomeSheet({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: {
  entry: DeliveryBoardEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const recordOutcome = useRecordOutcome();

  const handleSubmit = (values: DeliveryOutcomeInput) => {
    if (!entry) return;
    const target = resolveTarget(entry);
    recordOutcome.mutate(
      { kind: target.kind, id: target.id, data: values },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetBody>
        <SheetHeader>
          <SheetTitle>
            Record outcome{entry?.productName ? ` · ${entry.productName}` : ''}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <OutcomeForm onSubmit={handleSubmit} submitting={recordOutcome.isPending} />
        </div>
      </SheetBody>
    </Sheet>
  );
}
