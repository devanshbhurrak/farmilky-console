import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/form-field';
import { holidaySchema, type HolidayInput } from '../schemas';

interface HolidayFormProps {
  defaultValues?: Partial<HolidayInput>;
  onSubmit: (data: HolidayInput) => void | Promise<void>;
  submitting?: boolean;
}

export function HolidayForm({ defaultValues, onSubmit, submitting }: HolidayFormProps) {
  const form = useForm<HolidayInput>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      date: defaultValues?.date ?? new Date().toISOString().slice(0, 10),
      name: defaultValues?.name ?? '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField label="Date" required error={form.formState.errors.date?.message}>
        <Input type="date" {...form.register('date')} />
      </FormField>
      <FormField label="Name" required error={form.formState.errors.name?.message}>
        <Input placeholder="e.g. Diwali" {...form.register('name')} />
      </FormField>
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Save holiday
      </Button>
    </form>
  );
}
