import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { DeliveryBoardEntry } from '@/types/delivery';
import { useRecordDeliveryOutcome } from '../hooks';
import type { DeliveryOutcomeInput } from '../schemas';
import { OutcomeForm } from './outcome-form';

export interface EntryTarget {
  userId: string;
  type: 'subscription' | 'order';
  subscriptionId?: string | null;
  orderId?: string | null;
  deliverySlot?: 'morning' | 'evening' | null;
  id: string;
}

export function resolveTarget(entry: DeliveryBoardEntry): EntryTarget {
  return {
    userId: entry.userId,
    type: entry.type === 'order' ? 'order' : 'subscription',
    subscriptionId: entry.subscriptionId ?? null,
    orderId: entry.orderId ?? null,
    deliverySlot: entry.deliverySlot ?? null,
    id: entry.id,
  };
}

export function OutcomeSheet({
  entry,
  open,
  onOpenChange,
  onSuccess,
  date,
  defaultStatus = 'delivered',
}: {
  entry: DeliveryBoardEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Board date — prefills deliveryDate. */
  date?: string;
  defaultStatus?: DeliveryOutcomeInput['status'];
}) {
  const recordOutcome = useRecordDeliveryOutcome();

  const handleSubmit = (values: DeliveryOutcomeInput & { pricePerPacket?: number }) => {
    if (!entry) return;
    recordOutcome.mutate(
      {
        entry: resolveTarget(entry),
        data: {
          ...values,
          deliveryDate: values.deliveryDate ?? date ?? new Date().toISOString().slice(0, 10),
        },
      },
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
      <SheetContent
        side="bottom"
        className="!inset-x-0 !inset-y-auto !bottom-0 !left-0 !right-0 !w-full !max-h-[92dvh] !rounded-t-2xl !animate-slide-up"
      >
        <SheetHeader>
          <SheetTitle>
            Record outcome{entry?.productName ? ` · ${entry.productName}` : ''}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="mx-auto w-full max-w-2xl">
          <OutcomeForm
            key={`${entry?.id ?? 'new'}-${defaultStatus}`}
            kind={entry ? resolveTarget(entry).type : 'subscription'}
            defaultValues={{
              status: defaultStatus,
              deliveryDate: date,
              slot: entry?.deliverySlot ?? undefined,
            }}
            onSubmit={handleSubmit}
            submitting={recordOutcome.isPending}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
