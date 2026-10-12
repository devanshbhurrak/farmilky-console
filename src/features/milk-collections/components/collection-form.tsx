import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { confirmSchema } from '../schemas';
import type { ConfirmCollectionFormInput } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';

export interface CollectionFormDefaults {
  actualQty?: number;
  ratePerLiter?: number;
  fatContent?: number | null;
  snf?: number | null;
  notes?: string | null;
}

export function CollectionForm({
  defaultValues,
  onSubmit,
  submitting,
  title,
}: {
  defaultValues?: CollectionFormDefaults;
  onSubmit: (values: ConfirmCollectionFormInput) => void;
  submitting?: boolean;
  title?: string;
}) {
  const form = useForm<ConfirmCollectionFormInput>({
    resolver: zodResolver(confirmSchema) as unknown as Resolver<ConfirmCollectionFormInput>,
    defaultValues: {
      actualQty: defaultValues?.actualQty ?? 0,
      ratePerLiter: defaultValues?.ratePerLiter ?? 0,
      fatContent: defaultValues?.fatContent ?? undefined,
      snf: defaultValues?.snf ?? undefined,
      notes: defaultValues?.notes ?? '',
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values as unknown as ConfirmCollectionFormInput))}
      className="flex flex-col gap-4"
    >
      {title && <h3 className="text-base font-medium text-slate-900">{title}</h3>}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Actual qty (L)" required error={form.formState.errors.actualQty?.message}>
          <Input
            type="number"
            min={0}
            step="0.1"
            className="mt-1"
            {...form.register('actualQty')}
          />
        </FormField>
        <FormField label="Rate / L (₹)" required error={form.formState.errors.ratePerLiter?.message}>
          <Input
            type="number"
            min={0}
            step="0.5"
            className="mt-1"
            {...form.register('ratePerLiter')}
          />
        </FormField>
        <FormField label="Fat %" error={form.formState.errors.fatContent?.message}>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="mt-1"
            {...form.register('fatContent')}
          />
        </FormField>
        <FormField label="SNF" error={form.formState.errors.snf?.message}>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="mt-1"
            {...form.register('snf')}
          />
        </FormField>
      </div>
      <FormField label="Notes" error={form.formState.errors.notes?.message}>
        <Textarea className="mt-1" rows={2} placeholder="Optional notes…" {...form.register('notes')} />
      </FormField>
      <Button type="submit" loading={submitting} className="min-h-11 w-full">
        Save
      </Button>
    </form>
  );
}
