import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FormField } from '@/components/form/form-field';
import { cn, formatCurrency, formatDate, getErrorMessage, getId, titleCase, todayLocal } from '@/lib/utils';
import { useCustomerLedger, useRecordAdjustment, useRecordPayment } from '../hooks';
import type { LedgerEntry, LedgerSummary } from '@/types/customer';

const collectSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least ₹1'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'online', 'COD']).default('cash'),
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
    defaultValues: { amount: undefined as unknown as number, date: todayLocal(), paymentMethod: 'cash', transactionId: '', notes: '' },
  });

  async function submit(values: CollectValues) {
    await record.mutateAsync({
      userId,
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      date: values.date,
      transactionId: values.transactionId || undefined,
      notes: values.notes || undefined,
    });
    form.reset({ amount: undefined as unknown as number, date: todayLocal(), paymentMethod: 'cash', transactionId: '', notes: '' });
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
            <FormField label="Method" required error={form.formState.errors.paymentMethod?.message}>
              <Select {...form.register('paymentMethod')}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
                <option value="COD">COD</option>
              </Select>
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  online: 'Online',
  cod: 'COD',
};

function paymentMethodLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return PAYMENT_METHOD_LABELS[value.toLowerCase()] ?? titleCase(value);
}

function LedgerSummaryBar({ summary }: { summary: LedgerSummary }) {
  const netTone =
    summary.net > 0 ? 'text-rose-700' : summary.net < 0 ? 'text-emerald-700' : 'text-slate-900';

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-semibold text-slate-700">Month summary</p>
        <p className="text-[11px] text-slate-400">
          {summary.count} {summary.count === 1 ? 'entry' : 'entries'}
        </p>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-slate-100">
        <div className="min-w-0 px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
            Charges
          </dt>
          <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-amber-700">
            {formatCurrency(summary.debit)}
          </dd>
        </div>
        <div className="min-w-0 px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Payments
          </dt>
          <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-emerald-700">
            {formatCurrency(summary.credit)}
          </dd>
        </div>
        <div className="min-w-0 px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span
              className={cn(
                'size-1.5 rounded-full',
                summary.net > 0 ? 'bg-rose-500' : summary.net < 0 ? 'bg-emerald-500' : 'bg-slate-300',
              )}
              aria-hidden
            />
            Net
          </dt>
          <dd className={cn('mt-0.5 truncate text-sm font-semibold tabular-nums', netTone)}>
            {formatCurrency(summary.net)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function LedgerCard({ entry }: { entry: LedgerEntry }) {
  const isDebit = entry.type === 'debit';
  const method = paymentMethodLabel(entry.paymentType);
  const meta = [formatDate(entry.date), entry.category ? titleCase(entry.category) : null, method].filter(
    Boolean,
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <span
            className={cn(
              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
              isDebit ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
            )}
            aria-hidden
          >
            {isDebit ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{entry.description}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{meta.join(' · ')}</p>
            {entry.transactionId ? (
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Ref: {entry.transactionId}</p>
            ) : null}
            {entry.notes && entry.notes !== entry.description ? (
              <p className="mt-0.5 truncate text-[11px] text-slate-400">{entry.notes}</p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              'text-sm font-bold tabular-nums whitespace-nowrap',
              isDebit ? 'text-amber-700' : 'text-emerald-700',
            )}
          >
            {isDebit ? '+' : '−'}
            {formatCurrency(entry.amount)}
          </p>
          <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
            {isDebit ? 'Charge' : 'Payment'}
          </p>
        </div>
      </div>
    </div>
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
  const now = new Date();
  const selectedMonth = month ?? now.getMonth() + 1;
  const selectedYear = year ?? now.getFullYear();
  const { data, isLoading, error, refetch } = useCustomerLedger(userId, {
    month: selectedMonth,
    year: selectedYear,
  });

  const columns: Column<LedgerEntry>[] = [
    {
      header: 'Date',
      className: 'whitespace-nowrap',
      cell: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span>,
    },
    {
      header: 'Description',
      cell: (e) => {
        const meta = [e.category ? titleCase(e.category) : null, paymentMethodLabel(e.paymentType)]
          .filter(Boolean)
          .join(' · ');
        return (
          <div>
            <p className="font-medium text-slate-800">{e.description}</p>
            {meta ? <p className="text-xs text-slate-500">{meta}</p> : null}
            {e.transactionId ? <p className="text-xs text-slate-400">Ref: {e.transactionId}</p> : null}
          </div>
        );
      },
    },
    {
      header: 'Debit',
      className: 'whitespace-nowrap',
      cell: (e) =>
        e.type === 'debit' ? (
          <span className="font-medium whitespace-nowrap text-amber-700">{formatCurrency(e.amount)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      header: 'Credit',
      className: 'whitespace-nowrap',
      cell: (e) =>
        e.type !== 'debit' ? (
          <span className="font-medium whitespace-nowrap text-emerald-700">{formatCurrency(e.amount)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  return (
    <div>
      {!isLoading && !error && data && data.entries.length > 0 ? (
        <LedgerSummaryBar summary={data.summary} />
      ) : null}
      <DataTable<LedgerEntry>
        data={data?.entries ?? []}
        columns={columns}
        keyExtractor={(e, i) => getId(e) || `entry-${i}`}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => refetch()}
        emptyTitle="No ledger entries"
        emptyMessage="Payments and charges for this month will appear here."
        renderCard={(entry) => <LedgerCard entry={entry} />}
      />
    </div>
  );
}
