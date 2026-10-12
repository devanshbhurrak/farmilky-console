import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { formatCurrency, formatDate, getErrorMessage, todayLocal } from '@/lib/utils';
import { collectPaymentSchema, type CollectPaymentInput } from '../schemas';
import { usePassbook, useRecordPayment } from '../hooks';

export function CustomerPaymentForm({
  customerId,
  defaultAmount,
  onSuccess,
}: {
  customerId: string;
  defaultAmount?: number;
  onSuccess?: () => void;
}) {
  const [collectUpTo, setCollectUpTo] = useState<string>(todayLocal());
  const { data: passbook, isPending } = usePassbook(customerId, Boolean(customerId));

  const entriesUpTo = (passbook?.entries ?? []).filter((e) => {
    if (!collectUpTo) return true;
    return String(e.date ?? '').slice(0, 10) <= collectUpTo;
  });
  let debits = 0;
  let credits = 0;
  for (const e of entriesUpTo) {
    const amt = Number(e.amount ?? 0);
    if (e.type === 'debit') debits += amt;
    else credits += amt;
  }
  const netDue = debits - credits;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CollectPaymentInput>({
    resolver: zodResolver(collectPaymentSchema) as unknown as Resolver<CollectPaymentInput>,
    defaultValues: {
      userId: customerId,
      amount: defaultAmount ?? 0,
      date: todayLocal(),
      receivedDate: todayLocal(),
      transactionId: '',
      notes: '',
    },
  });

  useEffect(() => {
    setValue('userId', customerId);
  }, [customerId, setValue]);

  useEffect(() => {
    if (defaultAmount === undefined && Number.isFinite(netDue) && netDue > 0) {
      setValue('amount', Math.round(netDue * 100) / 100);
    }
  }, [netDue, defaultAmount, setValue]);

  const recordPayment = useRecordPayment();

  const onSubmit = (values: CollectPaymentInput) => {
    recordPayment.mutate(
      {
        userId: customerId,
        amount: Number(values.amount),
        date: values.date,
        receivedDate: values.receivedDate || undefined,
        transactionId: values.transactionId || undefined,
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
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        {isPending ? (
          <p className="text-slate-500">Loading passbook…</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Charges (to {formatDate(collectUpTo)})</span>
              <span className="font-medium">{formatCurrency(debits)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payments received</span>
              <span className="font-medium">{formatCurrency(credits)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-1">
              <span className="font-medium text-slate-700">Net due</span>
              <span className={`font-semibold ${netDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(netDue)}
              </span>
            </div>
          </div>
        )}
      </div>

      <FormField label="Collect up to" hint="Passbook summary is computed from entries on or before this date">
        <Input
          type="date"
          value={collectUpTo}
          max={todayLocal()}
          onChange={(e) => setCollectUpTo(e.target.value)}
          className="min-h-11"
        />
      </FormField>

      <FormField label="Amount" required error={errors.amount?.message}>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...register('amount')}
          className="min-h-11"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Payment date" required error={errors.date?.message}>
          <Input type="date" {...register('date')} className="min-h-11" />
        </FormField>
        <FormField label="Received date" error={errors.receivedDate?.message}>
          <Input type="date" {...register('receivedDate')} className="min-h-11" />
        </FormField>
      </div>

      <FormField label="Transaction ID" error={errors.transactionId?.message}>
        <Input placeholder="UPI / bank reference (optional)" {...register('transactionId')} className="min-h-11" />
      </FormField>

      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea placeholder="Optional note" {...register('notes')} />
      </FormField>

      <Button type="submit" loading={isSubmitting || recordPayment.isPending} className="min-h-11">
        Record payment
      </Button>
    </form>
  );
}
