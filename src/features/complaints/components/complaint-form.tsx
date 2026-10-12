import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { complaintSchema } from '../schemas';
import type { ComplaintFormInput } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';

export function ComplaintForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: ComplaintFormInput) => void;
  submitting?: boolean;
}) {
  const form = useForm<ComplaintFormInput>({
    resolver: zodResolver(complaintSchema),
    defaultValues: { subject: '', description: '', category: '', relatedTo: 'customer', relatedId: '', userId: '' },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="flex flex-col gap-4">
      <FormField label="Subject" required error={form.formState.errors.subject?.message}>
        <Input className="mt-1" placeholder="e.g. Late delivery" {...form.register('subject')} />
      </FormField>
      <FormField label="Description" error={form.formState.errors.description?.message}>
        <Textarea className="mt-1" rows={3} placeholder="Describe the issue…" {...form.register('description')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Category">
          <Input className="mt-1" placeholder="delivery, quality…" {...form.register('category')} />
        </FormField>
        <FormField label="Related to">
          <Input className="mt-1" placeholder="customer" {...form.register('relatedTo')} />
        </FormField>
      </div>
      <FormField label="Customer (user id, optional)">
        <Input className="mt-1" placeholder="User ID" {...form.register('userId')} />
      </FormField>
      <Button type="submit" loading={submitting} className="min-h-11 w-full">
        Create complaint
      </Button>
    </form>
  );
}
