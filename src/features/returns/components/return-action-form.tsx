import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { returnActionSchema } from '../schemas';
import type { ReturnActionInput } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';

export function ReturnActionForm({
  defaultStatus,
  defaultRefund,
  onSubmit,
  submitting,
}: {
  defaultStatus?: string;
  defaultRefund?: number | null;
  onSubmit: (values: ReturnActionInput) => void;
  submitting?: boolean;
}) {
  const form = useForm<ReturnActionInput>({
    resolver: zodResolver(returnActionSchema) as unknown as Resolver<ReturnActionInput>,
    defaultValues: {
      status: (defaultStatus as ReturnActionInput['status']) ?? 'approved',
      refundAmount: defaultRefund ?? undefined,
      adminNotes: '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => onSubmit(values as unknown as ReturnActionInput))} className="flex flex-col gap-4">
      <FormField label="Status" required error={form.formState.errors.status?.message}>
        <Select className="mt-1" {...form.register('status')}>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </Select>
      </FormField>
      <FormField label="Refund amount (₹)" error={form.formState.errors.refundAmount?.message}>
        <Input type="number" min={0} step="1" className="mt-1" placeholder="0" {...form.register('refundAmount')} />
      </FormField>
      <FormField label="Admin notes" error={form.formState.errors.adminNotes?.message}>
        <Textarea className="mt-1" rows={3} placeholder="Optional notes…" {...form.register('adminNotes')} />
      </FormField>
      <Button type="submit" loading={submitting} className="min-h-11 w-full">
        Save
      </Button>
    </form>
  );
}
