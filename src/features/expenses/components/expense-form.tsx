import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@/types/expense';
import { titleCase } from '@/lib/utils';
import { expenseSchema, type ExpenseInput } from '../schemas';

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseInput>;
  onSubmit: (data: ExpenseInput) => void | Promise<void>;
  submitting?: boolean;
}

export function ExpenseForm({ defaultValues, onSubmit, submitting }: ExpenseFormProps) {
  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema) as unknown as Resolver<ExpenseInput>,
    defaultValues: {
      amount: defaultValues?.amount ?? ('' as unknown as number),
      category: defaultValues?.category ?? 'miscellaneous',
      date: defaultValues?.date ?? new Date().toISOString().slice(0, 10),
      description: defaultValues?.description ?? '',
      paymentMethod: defaultValues?.paymentMethod ?? 'cash',
      receiptReference: defaultValues?.receiptReference ?? '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Amount (₹)" required error={form.formState.errors.amount?.message}>
          <Input type="number" min={0} step="any" placeholder="0" {...form.register('amount')} />
        </FormField>
        <FormField label="Date" required error={form.formState.errors.date?.message}>
          <Input type="date" {...form.register('date')} />
        </FormField>
      </div>
      <FormField label="Category" required error={form.formState.errors.category?.message}>
        <Select {...form.register('category')}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Description" required error={form.formState.errors.description?.message}>
        <Textarea placeholder="What was this expense for?" {...form.register('description')} />
      </FormField>
      <FormField label="Payment method" error={form.formState.errors.paymentMethod?.message}>
        <Select {...form.register('paymentMethod')}>
          {EXPENSE_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Receipt reference" error={form.formState.errors.receiptReference?.message}>
        <Input placeholder="Bill no. / UTR (optional)" {...form.register('receiptReference')} />
      </FormField>
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Save expense
      </Button>
    </form>
  );
}
