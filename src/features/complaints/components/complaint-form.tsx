import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { complaintSchema, COMPLAINT_REFERENCE_TYPES, COMPLAINT_RELATED_TO } from '../schemas';
import type { ComplaintFormInput } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { titleCase } from '@/lib/utils';

export function ComplaintForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: ComplaintFormInput) => void;
  submitting?: boolean;
}) {
  const form = useForm<ComplaintFormInput>({
    resolver: zodResolver(complaintSchema) as unknown as Resolver<ComplaintFormInput>,
    defaultValues: {
      subject: '',
      description: '',
      relatedTo: 'other',
      referenceType: undefined,
      referenceId: '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="flex flex-col gap-4">
      <FormField label="Subject" required error={form.formState.errors.subject?.message}>
        <Input className="mt-1" placeholder="e.g. Late delivery" {...form.register('subject')} />
      </FormField>
      <FormField label="Description" required error={form.formState.errors.description?.message}>
        <Textarea className="mt-1" rows={3} placeholder="Describe the issue…" {...form.register('description')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Related to" required error={form.formState.errors.relatedTo?.message}>
          <Select className="mt-1" {...form.register('relatedTo')}>
            {COMPLAINT_RELATED_TO.map((opt) => (
              <option key={opt} value={opt}>
                {titleCase(opt)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reference type" error={form.formState.errors.referenceType?.message}>
          <Select className="mt-1" {...form.register('referenceType')}>
            <option value="">None</option>
            {COMPLAINT_REFERENCE_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {titleCase(opt)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField
        label="Reference ID"
        hint="Order, subscription, manifest or product id"
        error={form.formState.errors.referenceId?.message}
      >
        <Input className="mt-1" placeholder="Optional id" {...form.register('referenceId')} />
      </FormField>
      <Button type="submit" loading={submitting} className="min-h-11 w-full">
        Create complaint
      </Button>
    </form>
  );
}
