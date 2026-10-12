import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { FormField } from '@/components/form/form-field';
import { cn } from '@/lib/utils';
import { getId } from '@/lib/utils';
import { useOrderOutcome, useUpdateOrderStatus } from '../hooks';
import type { Order } from '@/types/order';
import { orderStatusOf } from './order-table';

const STEPS = ['placed', 'confirmed', 'delivered'] as const;

const outcomeSchema = z.object({
  paymentMode: z.enum(['COD', 'online', 'upi', 'subscription_ledger']),
  notes: z.string().optional(),
});

type OutcomeValues = z.infer<typeof outcomeSchema>;

export function OrderStatusActions({ order }: { order: Order }) {
  const status = orderStatusOf(order);
  const updateStatus = useUpdateOrderStatus();
  const outcome = useOrderOutcome();
  const [outcomeOpen, setOutcomeOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const form = useForm<OutcomeValues>({
    resolver: zodResolver(outcomeSchema),
    defaultValues: { paymentMode: 'COD', notes: '' },
  });

  const stepIndex = status === 'delivered' ? 2 : status === 'confirmed' ? 1 : 0;
  const isTerminal = status === 'delivered' || status === 'cancelled';
  const busy = updateStatus.isPending || outcome.isPending;

  async function handleOutcome(values: OutcomeValues) {
    await outcome.mutateAsync({
      id: getId(order),
      data: { outcome: 'delivered', paymentMode: values.paymentMode, notes: values.notes || undefined },
    });
    setOutcomeOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex items-center gap-1" aria-label="Order progress">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <li className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold',
                  i <= stepIndex ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500',
                )}
              >
                {i + 1}
              </span>
              <span className={cn('text-xs font-medium capitalize', i <= stepIndex ? 'text-slate-900' : 'text-slate-400')}>
                {step}
              </span>
            </li>
            {i < STEPS.length - 1 && <span className={cn('mx-1 h-0.5 w-6 rounded', i < stepIndex ? 'bg-primary-600' : 'bg-slate-200')} aria-hidden />}
          </React.Fragment>
        ))}
      </ol>

      {!isTerminal && (
        <div className="flex flex-wrap gap-2">
          {status === 'placed' && (
            <Button
              size="sm"
              onClick={() => updateStatus.mutate({ id: getId(order), status: 'confirmed' })}
              loading={updateStatus.isPending}
              disabled={busy}
              className="min-h-11"
            >
              <Check aria-hidden /> Confirm order
            </Button>
          )}
          {status === 'confirmed' && (
            <Button size="sm" onClick={() => setOutcomeOpen(true)} disabled={busy} className="min-h-11">
              <Truck aria-hidden /> Mark delivered
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)} disabled={busy} className="min-h-11">
            <X aria-hidden /> Cancel
          </Button>
        </div>
      )}

      <Sheet open={outcomeOpen} onOpenChange={setOutcomeOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Delivery outcome</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <form onSubmit={form.handleSubmit(handleOutcome)} className="flex flex-col gap-4">
              <FormField label="Payment mode" required>
                <Select {...form.register('paymentMode')}>
                  <option value="COD">COD</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online</option>
                  <option value="subscription_ledger">Subscription ledger</option>
                </Select>
              </FormField>
              <FormField label="Notes">
                <Input placeholder="Delivery notes…" {...form.register('notes')} />
              </FormField>
              <Button type="submit" loading={outcome.isPending} className="min-h-11">
                Confirm delivery
              </Button>
            </form>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel order?"
        description="This will cancel the order. This action can be reversed by support if needed."
        confirmLabel="Cancel order"
        loading={updateStatus.isPending}
        onConfirm={() => {
          updateStatus.mutate(
            { id: getId(order), status: 'cancelled' },
            { onSuccess: () => setCancelOpen(false) },
          );
        }}
      />
    </div>
  );
}
