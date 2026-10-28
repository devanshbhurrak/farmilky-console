import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { FormField, FormSection } from '@/components/form/form-field';
import { formatCurrency, formatDate, getId, todayLocal } from '@/lib/utils';
import { useCollectionTotal, useRecordSupplierAdjustment, useRecordSupplierPayment, useSupplier, useSupplierPassbook, useUpdateSupplier } from './hooks';
import { SupplierForm } from './components/supplier-form';
import type { SupplierInput } from './schemas';
import type { LedgerEntry } from '@/types/customer';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least ₹1'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

const adjustmentSchema = z.object({
  type: z.enum(['debit', 'credit']),
  category: z.enum(['advance', 'transport', 'quality_bonus', 'quality_penalty', 'rounding', 'other']),
  amount: z.coerce.number().min(1, 'Amount must be at least ₹1'),
  date: z.string().optional(),
  description: z.string().trim().min(1, 'Description is required'),
});

type PaymentValues = z.infer<typeof paymentSchema>;
type AdjustmentValues = z.infer<typeof adjustmentSchema>;

function RecordPaymentSection({ supplierId }: { supplierId: string }) {
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema) as unknown as Resolver<PaymentValues>,
    defaultValues: { amount: 0, fromDate: '', toDate: '', paymentMethod: 'upi', transactionRef: '', notes: '' },
  });

  const fromDate = form.watch('fromDate');
  const toDate = form.watch('toDate');
  const { data: collectionTotal, isLoading: totalLoading } = useCollectionTotal(
    supplierId,
    fromDate && fromDate !== '' ? fromDate : undefined,
    toDate && toDate !== '' ? toDate : undefined,
  );
  const mutation = useRecordSupplierPayment();

  return (
    <FormSection title="Record payment" description="Payout for collected milk">
      <form
        onSubmit={form.handleSubmit((v) =>
          mutation.mutate(
            { supplierId, ...v, paymentMethod: v.paymentMethod || undefined, amount: v.amount },
            { onSuccess: () => form.reset({ amount: 0, fromDate: '', toDate: '', paymentMethod: 'upi', transactionRef: '', notes: '' }) },
          ),
        )}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="From date">
            <Input type="date" max={todayLocal()} {...form.register('fromDate')} />
          </FormField>
          <FormField label="To date">
            <Input type="date" max={todayLocal()} {...form.register('toDate')} />
          </FormField>
        </div>
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm">
          <span className="text-slate-500">Collection total{fromDate || toDate ? ' (selected period)' : ''}</span>
          <span className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">
              {totalLoading ? '…' : formatCurrency(collectionTotal?.grandTotal ?? 0)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={totalLoading || !collectionTotal?.grandTotal}
              onClick={() => form.setValue('amount', collectionTotal?.grandTotal ?? 0, { shouldValidate: true })}
            >
              Use total
            </Button>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Amount (₹)" required error={form.formState.errors.amount?.message}>
            <Input type="number" min={1} step={0.01} {...form.register('amount', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Payment method" error={form.formState.errors.paymentMethod?.message}>
            <Select
              value={form.watch('paymentMethod') || 'upi'}
              onChange={(e) => form.setValue('paymentMethod', e.target.value)}
              aria-label="Payment method"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Transaction ref" error={form.formState.errors.transactionRef?.message}>
            <Input placeholder="UTR / Reference" {...form.register('transactionRef')} />
          </FormField>
        </div>
        <FormField label="Notes" error={form.formState.errors.notes?.message}>
          <Input placeholder="Optional notes" {...form.register('notes')} />
        </FormField>
        <Button type="submit" loading={mutation.isPending} className="min-h-11 w-full sm:w-auto">
          Record payment
        </Button>
      </form>
    </FormSection>
  );
}

function AdjustmentSection({ supplierId }: { supplierId: string }) {
  const form = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema) as unknown as Resolver<AdjustmentValues>,
    defaultValues: { type: 'credit', category: 'other', amount: 0, date: todayLocal(), description: '' },
  });

  const mutation = useRecordSupplierAdjustment();

  return (
    <FormSection title="Adjustment" description="Advances, transport, quality bonuses/penalties">
      <form
        onSubmit={form.handleSubmit((v) =>
          mutation.mutate(
            { supplierId, data: v },
            { onSuccess: () => form.reset({ type: 'credit', category: 'other', amount: 0, date: todayLocal(), description: '' }) },
          ),
        )}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Type" required>
            <Select {...form.register('type')}>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </Select>
          </FormField>
          <FormField label="Category" required>
            <Select {...form.register('category')}>
              <option value="advance">Advance</option>
              <option value="transport">Transport</option>
              <option value="quality_bonus">Quality bonus</option>
              <option value="quality_penalty">Quality penalty</option>
              <option value="rounding">Rounding</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Amount" required error={form.formState.errors.amount?.message}>
            <Input type="number" min={1} step={0.01} {...form.register('amount', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Date">
            <Input type="date" max={todayLocal()} {...form.register('date')} />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea placeholder="Reason…" {...form.register('description')} />
        </FormField>
        <Button type="submit" loading={mutation.isPending} className="min-h-11 w-full sm:w-auto">
          Save adjustment
        </Button>
      </form>
    </FormSection>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { data: supplier, isLoading } = useSupplier(id);
  const { data: passbook, isLoading: passbookLoading } = useSupplierPassbook(id);
  const updateMutation = useUpdateSupplier();
  const [editOpen, setEditOpen] = React.useState(false);

  async function handleEdit(values: SupplierInput) {
    if (!id) return;
    await updateMutation.mutateAsync({ id, data: values });
    setEditOpen(false);
  }

  if (isLoading || !supplier) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Supplier" breadcrumbs={[{ label: 'Suppliers', path: '/suppliers' }, { label: 'Details' }]} />
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">{isLoading ? 'Loading…' : 'Supplier not found.'}</CardContent>
        </Card>
      </div>
    );
  }

  const due = Number(supplier.outstandingAmount ?? 0);

  const columns: Column<LedgerEntry>[] = [
    {
      header: 'Date',
      cell: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span>,
    },
    {
      header: 'Description',
      cell: (e) => <span className="font-medium text-slate-800">{e.description}</span>,
    },
    {
      header: 'Type',
      cell: (e) => <Badge variant={e.type === 'credit' ? 'success' : 'warning'}>{e.type}</Badge>,
    },
    {
      header: 'Amount',
      cell: (e) => <span className="font-medium whitespace-nowrap">{formatCurrency(e.amount)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={supplier.name}
        breadcrumbs={[{ label: 'Suppliers', path: '/suppliers' }, { label: supplier.name }]}
        actions={
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="min-h-11">
            <Pencil aria-hidden /> Edit
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Avatar name={supplier.name} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{supplier.name}</h2>
              <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
            </div>
            <p className="text-sm text-slate-500">
              {supplier.location ?? '—'}
              {supplier.phone ? ` · ${supplier.phone}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {supplier.defaultRatePerLiter !== undefined ? (
              <Badge variant="secondary">₹{supplier.defaultRatePerLiter}/L</Badge>
            ) : null}
            <Badge variant={due > 0 ? 'warning' : 'success'}>
              {due > 0 ? `Outstanding ${formatCurrency(due)}` : 'Settled'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<LedgerEntry>
            data={passbook ?? []}
            columns={columns}
            keyExtractor={(e, i) => e.id ?? `entry-${i}`}
            loading={passbookLoading}
            emptyTitle="No payments yet"
            emptyMessage="Recorded payouts and adjustments will appear here."
          />
        </CardContent>
      </Card>

      <RecordPaymentSection supplierId={getId(supplier)} />
      <AdjustmentSection supplierId={getId(supplier)} />

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit supplier</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <SupplierForm
              submitting={updateMutation.isPending}
              defaultValues={{
                name: supplier.name,
                phone: supplier.phone ?? '',
                email: supplier.email ?? '',
                location: supplier.location ?? '',
                pincode: supplier.pincode ?? '',
                joiningDate: supplier.joiningDate?.slice(0, 10) ?? '',
                collectionSessions: (Array.isArray(supplier.collectionSessions) ? supplier.collectionSessions : ['morning']) as ('morning' | 'evening')[],
                defaultMorningQty: supplier.defaultMorningQty,
                defaultEveningQty: supplier.defaultEveningQty,
                defaultRatePerLiter: supplier.defaultRatePerLiter,
                isActive: supplier.isActive,
                bankDetails: {
                  holderName: supplier.bankDetails?.holderName ?? '',
                  accountNo: supplier.bankDetails?.accountNo ?? '',
                  ifscCode: supplier.bankDetails?.ifscCode ?? '',
                  bankName: supplier.bankDetails?.bankName ?? '',
                },
                notes: supplier.notes ?? '',
              }}
              onSubmit={handleEdit}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
