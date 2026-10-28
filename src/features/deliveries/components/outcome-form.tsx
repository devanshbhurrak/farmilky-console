import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { todayLocal } from '@/lib/utils';
import { outcomeSchema } from '../schemas';
import type { DeliveryOutcomeInput } from '../schemas';

export function OutcomeForm({
  defaultValues,
  onSubmit,
  submitting,
  kind = 'subscription',
}: {
  defaultValues?: Partial<DeliveryOutcomeInput>;
  onSubmit: (values: DeliveryOutcomeInput) => void;
  submitting?: boolean;
  kind?: 'subscription' | 'order';
}) {
  const isOrder = kind === 'order';
  const form = useForm<DeliveryOutcomeInput>({
    resolver: zodResolver(outcomeSchema) as unknown as Resolver<DeliveryOutcomeInput>,
    shouldUnregister: true,
    defaultValues: {
      status: defaultValues?.status ?? 'delivered',
      actualQuantity: defaultValues?.actualQuantity,
      reason: defaultValues?.reason ?? '',
      notes: defaultValues?.notes ?? '',
      slot: defaultValues?.slot,
      deliveryDate: defaultValues?.deliveryDate ?? todayLocal(),
    },
  });

  const { register, handleSubmit, watch, formState } = form;
  const status = watch('status');
  const needsQty = !isOrder && (status === 'partial' || status === 'extra');
  const needsReason = status === 'failed' || status === 'skipped';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register('slot')} />
      <FormField label="Status" required error={formState.errors.status?.message}>
        <Select {...register('status')}>
          <option value="delivered">Delivered</option>
          {isOrder ? null : (
            <>
              <option value="partial">Partial</option>
              <option value="extra">Extra</option>
            </>
          )}
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </Select>
      </FormField>
      {needsQty && (
        <FormField
          label="Actual quantity"
          required
          error={formState.errors.actualQuantity?.message}
          hint="Required for partial / extra"
        >
          <Input type="number" min={0.001} step="any" {...register('actualQuantity')} />
        </FormField>
      )}
      <FormField
        label="Reason"
        required={needsReason}
        error={formState.errors.reason?.message}
        hint={needsReason ? 'Required for failed / skipped' : undefined}
      >
        <Input {...register('reason')} placeholder="Reason" />
      </FormField>
      <FormField label="Notes" error={formState.errors.notes?.message}>
        <Textarea {...register('notes')} placeholder="Optional notes" />
      </FormField>
      {isOrder ? null : (
        <FormField label="Delivery date" required error={formState.errors.deliveryDate?.message}>
          <Input type="date" max={todayLocal()} {...register('deliveryDate')} />
        </FormField>
      )}
      <Button type="submit" loading={submitting} className="min-h-11">
        Save outcome
      </Button>
    </form>
  );
}
