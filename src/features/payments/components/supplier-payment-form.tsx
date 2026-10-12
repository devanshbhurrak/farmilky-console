import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { formatCurrency, getErrorMessage, getId, getName, todayLocal } from '@/lib/utils';
import { supplierPaymentSchema, type SupplierPaymentInput } from '../schemas';
import { useRecordSupplierPayment, useSupplierCollectionTotal, useSuppliersLite } from '../hooks';

export function SupplierPaymentForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: suppliers, isPending: suppliersLoading } = useSuppliersLite();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierPaymentInput>({
    resolver: zodResolver(supplierPaymentSchema) as unknown as Resolver<SupplierPaymentInput>,
    defaultValues: {
      supplierId: '',
      fromDate: todayLocal(),
      toDate: todayLocal(),
      amount: 0,
      paymentMethod: 'cash',
      transactionRef: '',
      notes: '',
    },
  });

  const supplierId = watch('supplierId');
  const fromDate = watch('fromDate');
  const toDate = watch('toDate');

  const { data: collectionTotal, isPending: totalLoading } = useSupplierCollectionTotal(
    supplierId,
    fromDate,
    toDate,
  );

  const recordSupplierPayment = useRecordSupplierPayment();

  const onSubmit = (values: SupplierPaymentInput) => {
    recordSupplierPayment.mutate(
      {
        supplierId: values.supplierId,
        fromDate: values.fromDate,
        toDate: values.toDate,
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        transactionRef: values.transactionRef || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => onSuccess?.(),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Supplier" required error={errors.supplierId?.message}>
        <Select {...register('supplierId')} className="min-h-11" disabled={suppliersLoading}>
          <option value="">Select supplier</option>
          {(suppliers ?? []).map((s) => (
            <option key={getId(s)} value={getId(s)}>
              {getName(s)}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="From date" required error={errors.fromDate?.message}>
          <Input type="date" {...register('fromDate')} className="min-h-11" />
        </FormField>
        <FormField label="To date" required error={errors.toDate?.message}>
          <Input type="date" {...register('toDate')} className="min-h-11" />
        </FormField>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        {totalLoading ? (
          <p className="text-slate-500">Loading collection total…</p>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Collection total for period</span>
            <span className="font-semibold text-slate-900">{formatCurrency(collectionTotal?.total ?? 0)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Amount" required error={errors.amount?.message}>
          <Input type="number" min={0} step="0.01" placeholder="0.00" {...register('amount')} className="min-h-11" />
        </FormField>
        <FormField label="Payment method" required error={errors.paymentMethod?.message}>
          <Select {...register('paymentMethod')} className="min-h-11">
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="upi">UPI</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Transaction reference" error={errors.transactionRef?.message}>
        <Input placeholder="UTR / reference (optional)" {...register('transactionRef')} className="min-h-11" />
      </FormField>

      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea placeholder="Optional note" {...register('notes')} />
      </FormField>

      <Button type="submit" loading={isSubmitting || recordSupplierPayment.isPending} className="min-h-11">
        Record supplier payment
      </Button>
    </form>
  );
}
