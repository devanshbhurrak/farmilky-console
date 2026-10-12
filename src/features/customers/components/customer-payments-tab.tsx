import * as React from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FormField } from '@/components/form/form-field';
import { formatCurrency, formatDate, getErrorMessage, getId, todayLocal } from '@/lib/utils';
import { useCustomerPassbook, useRecordAdjustment, useRecordPayment } from '../hooks';
import type { LedgerEntry } from '@/types/customer';

const collectSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least ₹1'),
  date: z.string().min(1, 'Date is required'),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

const adjustSchema = z.object({
  type: z.enum(['credit_adjustment', 'debit_adjustment']),
  amount: z.coerce.number().min(1, 'Amount must be at least ₹1'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type CollectValues = z.infer<typeof collectSchema>;
type AdjustValues = z.infer<typeof adjustSchema>;

export function CollectPaymentDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const record = useRecordPayment();
  const form = useForm<CollectValues>({
    resolver: zodResolver(collectSchema) as unknown as Resolver<CollectValues>,
    defaultValues: { amount: undefined as unknown as number, date: todayLocal(), transactionId: '', notes: '' },
  });

  async function submit(values: CollectValues) {
    await record.mutateAsync({
      userId,
      amount: values.amount,
      type: 'credit',
      date: values.date,
      transactionId: values.transactionId || undefined,
      notes: values.notes || undefined,
    });
    form.reset({ amount: undefined as unknown as number, date: todayLocal(), transactionId: '', notes: '' });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
          <DialogBody className="flex flex-col gap-4">
            <FormField label="Amount" required error={form.formState.errors.amount?.message}>
              <Input type="number" min={1} placeholder="₹ Amount received" {...form.register('amount')} />
            </FormField>
            <FormField label="Date" required error={form.formState.errors.date?.message}>
              <Input type="date" {...form.register('date')} />
            </FormField>
            <FormField label="Transaction ID" error={form.formState.errors.transactionId?.message}>
              <Input placeholder="UPI ref / receipt no." {...form.register('transactionId')} />
            </FormField>
            <FormField label="Notes" error={form.formState.errors.notes?.message}>
              <Input placeholder="Optional note" {...form.register('notes')} />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={record.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={record.isPending}>
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustBalanceDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const adjust = useRecordAdjustment();
  const form = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema) as unknown as Resolver<AdjustValues>,
    defaultValues: { type: 'credit_adjustment', amount: undefined as unknown as number, date: todayLocal(), notes: '' },
  });

  async function submit(values: AdjustValues) {
    await adjust.mutateAsync({
      userId,
      data: {
        amount: values.amount,
        type: values.type,
        date: values.date,
        notes: values.notes || undefined,
      },
    });
    form.reset({ type: 'credit_adjustment', amount: undefined as unknown as number, date: todayLocal(), notes: '' });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Balance adjustment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
          <DialogBody className="flex flex-col gap-4">
            <FormField label="Adjustment type" required error={form.formState.errors.type?.message}>
              <Select {...form.register('type')}>
                <option value="credit_adjustment">Credit adjustment (reduce due)</option>
                <option value="debit_adjustment">Debit adjustment (increase due)</option>
              </Select>
            </FormField>
            <FormField label="Amount" required error={form.formState.errors.amount?.message}>
              <Input type="number" min={1} placeholder="₹ Amount" {...form.register('amount')} />
            </FormField>
            <FormField label="Date" required error={form.formState.errors.date?.message}>
              <Input type="date" {...form.register('date')} />
            </FormField>
            <FormField label="Notes" error={form.formState.errors.notes?.message}>
              <Input placeholder="Reason for adjustment" {...form.register('notes')} />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={adjust.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={adjust.isPending}>
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CollectAdjustDialogs({
  userId,
  collectOpen,
  onCollectChange,
  adjustOpen,
  onAdjustChange,
}: {
  userId: string;
  collectOpen: boolean;
  onCollectChange: (open: boolean) => void;
  adjustOpen: boolean;
  onAdjustChange: (open: boolean) => void;
}) {
  return (
    <>
      <CollectPaymentDialog userId={userId} open={collectOpen} onOpenChange={onCollectChange} />
      <AdjustBalanceDialog userId={userId} open={adjustOpen} onOpenChange={onAdjustChange} />
    </>
  );
}

export function CustomerPaymentsTab({
  userId,
  month,
  year,
}: {
  userId: string;
  month?: number;
  year?: number;
}) {
  const [collectOpen, setCollectOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const passbookParams = month !== undefined || year !== undefined ? { month, year } : undefined;
  const { data, isLoading, error, refetch } = useCustomerPassbook(userId, passbookParams);

  const columns: Column<LedgerEntry>[] = [
    {
      header: 'Date',
      cell: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span>,
    },
    {
      header: 'Description',
      cell: (e) => (
        <div>
          <p className="font-medium text-slate-800">{e.description}</p>
          {e.transactionId ? <p className="text-xs text-slate-500">Ref: {e.transactionId}</p> : null}
        </div>
      ),
    },
    {
      header: 'Debit',
      cell: (e) =>
        e.type === 'debit' ? (
          <span className="font-medium whitespace-nowrap text-amber-700">{formatCurrency(e.amount)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      header: 'Credit',
      cell: (e) =>
        e.type !== 'debit' ? (
          <span className="font-medium whitespace-nowrap text-emerald-700">{formatCurrency(e.amount)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setCollectOpen(true)} className="min-h-11">
          Collect payment
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)} className="min-h-11">
          Adjust balance
        </Button>
      </div>
      <DataTable<LedgerEntry>
        data={data ?? []}
        columns={columns}
        keyExtractor={(e, i) => getId(e) || `entry-${i}`}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => refetch()}
        emptyTitle="No ledger entries"
        emptyMessage="Payments and charges for this month will appear here."
      />
      <CollectAdjustDialogs
        userId={userId}
        collectOpen={collectOpen}
        onCollectChange={setCollectOpen}
        adjustOpen={adjustOpen}
        onAdjustChange={setAdjustOpen}
      />
    </div>
  );
}
