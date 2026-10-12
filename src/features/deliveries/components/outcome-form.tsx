import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { outcomeSchema } from '../schemas';
import type { DeliveryOutcomeInput } from '../schemas';

export function OutcomeForm({
  defaultValues,
  onSubmit,
  submitting,
}: {
  defaultValues?: Partial<DeliveryOutcomeInput>;
  onSubmit: (values: DeliveryOutcomeInput) => void;
  submitting?: boolean;
}) {
  const form = useForm<DeliveryOutcomeInput>({
    resolver: zodResolver(outcomeSchema) as unknown as Resolver<DeliveryOutcomeInput>,
    defaultValues: {
      status: defaultValues?.status ?? 'delivered',
      actualQuantity: defaultValues?.actualQuantity,
      reason: defaultValues?.reason ?? '',
      notes: defaultValues?.notes ?? '',
      paymentMode: defaultValues?.paymentMode ?? 'COD',
    },
  });

  const { register, handleSubmit, watch, formState } = form;
  const status = watch('status');
  const needsQty = status === 'partial' || status === 'extra';
  const needsReason = status === 'failed' || status === 'skipped';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Status" required error={formState.errors.status?.message}>
        <Select {...register('status')}>
          <option value="delivered">Delivered</option>
          <option value="partial">Partial</option>
          <option value="extra">Extra</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </Select>
      </FormField>
      <FormField
        label="Actual quantity"
        required={needsQty}
        error={formState.errors.actualQuantity?.message}
        hint={needsQty ? 'Required for partial / extra' : undefined}
      >
        <Input type="number" min={0} step="any" {...register('actualQuantity')} />
      </FormField>
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
      <FormField label="Payment mode">
        <Select {...register('paymentMode')}>
          <option value="COD">COD</option>
          <option value="online">Online</option>
          <option value="upi">UPI</option>
          <option value="subscription_ledger">Subscription ledger</option>
        </Select>
      </FormField>
      <Button type="submit" loading={submitting} className="min-h-11">
        Save outcome
      </Button>
    </form>
  );
}
