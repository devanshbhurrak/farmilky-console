import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
  Pencil,
  Phone,
  Wallet,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/data/status-badge';
import { FormField, FormSection } from '@/components/form/form-field';
import { formatCurrency, formatDate, getId, todayLocal, cn } from '@/lib/utils';
import {
  useCollectionTotal,
  useRecordSupplierAdjustment,
  useRecordSupplierPayment,
  useSupplier,
  useSupplierPassbook,
  useUpdateSupplier,
} from './hooks';
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

const PAYMENT_DEFAULTS: PaymentValues = {
  amount: 0,
  fromDate: '',
  toDate: '',
  paymentMethod: 'upi',
  transactionRef: '',
  notes: '',
};

const ADJUSTMENT_DEFAULTS: AdjustmentValues = {
  type: 'credit',
  category: 'other',
  amount: 0,
  date: todayLocal(),
  description: '',
};

function getMonthKey(date: LedgerEntry['date']): string {
  if (!date) return 'undated';

  const rawDate = String(date);
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return 'undated';

  return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  if (monthKey === 'undated') return 'Undated transactions';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

function shiftMonth(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(year, month - 1 + amount, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

function InfoValue({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-slate-400 sm:text-[10px]">{label}</p>
      <div className="mt-0.5 break-words text-xs font-medium leading-4 text-slate-700">{children}</div>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="size-3.5 text-slate-400" aria-hidden="true" />
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function RecordPaymentSection({
  supplierId,
  onSuccess,
}: {
  supplierId: string;
  onSuccess: () => void;
}) {
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema) as unknown as Resolver<PaymentValues>,
    defaultValues: PAYMENT_DEFAULTS,
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
    <FormSection title="Payment details" description="Record a payout against the supplier's milk collection.">
      <form
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate(
            {
              supplierId,
              ...values,
              paymentMethod: values.paymentMethod || undefined,
              amount: values.amount,
            },
            {
              onSuccess: () => {
                form.reset(PAYMENT_DEFAULTS);
                onSuccess();
              },
            },
          ),
        )}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="From date">
            <Input type="date" max={todayLocal()} {...form.register('fromDate')} />
          </FormField>
          <FormField label="To date">
            <Input type="date" max={todayLocal()} {...form.register('toDate')} />
          </FormField>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Collection total{fromDate || toDate ? ' · selected period' : ''}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              {totalLoading ? 'Calculating…' : formatCurrency(collectionTotal?.grandTotal ?? 0)}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-10 w-full sm:w-auto"
            disabled={totalLoading || !collectionTotal?.grandTotal}
            onClick={() =>
              form.setValue('amount', collectionTotal?.grandTotal ?? 0, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          >
            Use collection total
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Amount (₹)" required error={form.formState.errors.amount?.message}>
            <Input
              type="number"
              min={1}
              step={0.01}
              inputMode="decimal"
              placeholder="Enter payment amount"
              {...form.register('amount', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Payment method" error={form.formState.errors.paymentMethod?.message}>
            <Select
              value={form.watch('paymentMethod') || 'upi'}
              onChange={(event) => form.setValue('paymentMethod', event.target.value)}
              aria-label="Payment method"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Transaction reference">
          <Input placeholder="UTR / UPI reference (optional)" {...form.register('transactionRef')} />
        </FormField>

        <FormField label="Notes">
          <Textarea placeholder="Add a note about this payment (optional)" rows={3} {...form.register('notes')} />
        </FormField>

        <div className="border-t border-slate-100 pt-3">
          <Button type="submit" loading={mutation.isPending} className="min-h-11 w-full sm:w-auto sm:min-w-36">
            Record payment
          </Button>
        </div>
      </form>
    </FormSection>
  );
}

function AdjustmentSection({
  supplierId,
  onSuccess,
}: {
  supplierId: string;
  onSuccess: () => void;
}) {
  const form = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema) as unknown as Resolver<AdjustmentValues>,
    defaultValues: ADJUSTMENT_DEFAULTS,
  });
  const mutation = useRecordSupplierAdjustment();

  return (
    <FormSection title="Adjustment details" description="Add an advance, deduction, bonus, penalty, or other ledger adjustment.">
      <form
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate(
            { supplierId, data: values },
            {
              onSuccess: () => {
                form.reset({ ...ADJUSTMENT_DEFAULTS, date: todayLocal() });
                onSuccess();
              },
            },
          ),
        )}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Adjustment type" required>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Amount (₹)" required error={form.formState.errors.amount?.message}>
            <Input
              type="number"
              min={1}
              step={0.01}
              inputMode="decimal"
              placeholder="Enter adjustment amount"
              {...form.register('amount', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Date">
            <Input type="date" max={todayLocal()} {...form.register('date')} />
          </FormField>
        </div>

        <FormField label="Description" required error={form.formState.errors.description?.message}>
          <Textarea placeholder="Describe the reason for this adjustment" rows={3} {...form.register('description')} />
        </FormField>

        <div className="border-t border-slate-100 pt-3">
          <Button type="submit" loading={mutation.isPending} className="min-h-11 w-full sm:w-auto sm:min-w-36">
            Save adjustment
          </Button>
        </div>
      </form>
    </FormSection>
  );
}

function TransactionRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.type === 'credit';

  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3 transition-colors hover:bg-slate-50/80 sm:px-4">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        )}
      >
        {isCredit ? (
          <ArrowDownRight className="size-4" aria-hidden="true" />
        ) : (
          <ArrowUpRight className="size-4" aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium leading-5 text-slate-800">
          {entry.description || (isCredit ? 'Credit entry' : 'Debit entry')}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          {entry.date ? <span>{formatDate(entry.date)}</span> : null}
          <Badge variant={isCredit ? 'success' : 'warning'} className="px-1.5 py-0 text-[10px]">
            {isCredit ? 'Credit' : 'Debit'}
          </Badge>
        </div>
      </div>

      <p
        className={cn(
          'shrink-0 pl-2 text-right text-sm font-semibold tabular-nums sm:text-base',
          isCredit ? 'text-emerald-700' : 'text-slate-800',
        )}
      >
        {isCredit ? '+' : '−'} {formatCurrency(entry.amount)}
      </p>
    </div>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { data: supplier, isLoading } = useSupplier(id);
  const { data: passbook, isLoading: passbookLoading } = useSupplierPassbook(id);
  const updateMutation = useUpdateSupplier();

  const [editOpen, setEditOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState(() => todayLocal().slice(0, 7));
  const [monthPickerOpen, setMonthPickerOpen] = React.useState(false);

  async function handleEdit(values: SupplierInput) {
    if (!id) return;
    await updateMutation.mutateAsync({ id, data: values });
    setEditOpen(false);
  }

  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number);
  const selectedMonthLabel = formatMonthLabel(selectedMonth);
  const selectedMonthEntries = React.useMemo(
    () => (passbook ?? [])
      .filter((entry) => getMonthKey(entry.date) === selectedMonth)
      .sort((a, b) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime()),
    [passbook, selectedMonth],
  );
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 10; year <= currentYear + 2; year += 1) years.add(year);
    for (const entry of passbook ?? []) {
      const key = getMonthKey(entry.date);
      if (key !== 'undated') years.add(Number(key.slice(0, 4)));
    }
    years.add(selectedYear);
    return [...years].filter(Number.isFinite).sort((a, b) => b - a);
  }, [passbook, selectedYear]);

  function navigateMonth(offset: number) {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    setMonthPickerOpen(false);
  }

  function selectMonth(monthKey: string) {
    setSelectedMonth(monthKey);
    setMonthPickerOpen(false);
  }

  if (isLoading || !supplier) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Supplier profile"
          breadcrumbs={[{ label: 'Suppliers', path: '/suppliers' }, { label: 'Details' }]}
        />
        <Card>
          <CardContent className="p-5 sm:p-6">
            <p className="text-sm text-slate-500">{isLoading ? 'Loading supplier details…' : 'Supplier not found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supplierId = getId(supplier);
  const hasValue = (value: unknown): boolean =>
    value !== undefined && value !== null && String(value).trim() !== '';
  const due = hasValue(supplier.outstandingAmount) ? Number(supplier.outstandingAmount) : null;
  const parsedDefaultRate = hasValue(supplier.defaultRatePerLiter)
    ? Number(supplier.defaultRatePerLiter)
    : null;
  // A zero/invalid default rate is not useful profile information, so omit it.
  const defaultRate = parsedDefaultRate !== null && Number.isFinite(parsedDefaultRate) && parsedDefaultRate > 0
    ? parsedDefaultRate
    : null;
  const sessions = Array.isArray(supplier.collectionSessions)
    ? supplier.collectionSessions.filter((session) => hasValue(session))
    : [];
  const phone = hasValue(supplier.phone) ? String(supplier.phone).trim() : '';
  const email = hasValue(supplier.email) ? String(supplier.email).trim() : '';
  const location = hasValue(supplier.location) ? String(supplier.location).trim() : '';
  const pincode = hasValue(supplier.pincode) ? String(supplier.pincode).trim() : '';
  // Hide unset, zero, or invalid default quantities instead of rendering empty-looking fields.
  const parsedMorningQty = hasValue(supplier.defaultMorningQty) ? Number(supplier.defaultMorningQty) : null;
  const parsedEveningQty = hasValue(supplier.defaultEveningQty) ? Number(supplier.defaultEveningQty) : null;
  const morningQty = parsedMorningQty !== null && Number.isFinite(parsedMorningQty) && parsedMorningQty > 0
    ? parsedMorningQty
    : null;
  const eveningQty = parsedEveningQty !== null && Number.isFinite(parsedEveningQty) && parsedEveningQty > 0
    ? parsedEveningQty
    : null;
  const bankHolder = hasValue(supplier.bankDetails?.holderName) ? supplier.bankDetails?.holderName : '';
  const bankName = hasValue(supplier.bankDetails?.bankName) ? supplier.bankDetails?.bankName : '';
  const bankIfsc = hasValue(supplier.bankDetails?.ifscCode) ? supplier.bankDetails?.ifscCode : '';
  const bankAccount = hasValue(supplier.bankDetails?.accountNo) ? supplier.bankDetails?.accountNo : '';
  const notes = hasValue(supplier.notes) ? String(supplier.notes).trim() : '';
  const hasContactDetails = Boolean(phone || email || location || pincode);
  const hasCollectionDetails = sessions.length > 0 || morningQty !== null || eveningQty !== null;
  const hasBankDetails = Boolean(bankHolder || bankName || bankIfsc || bankAccount);
  const hasAnyProfileDetails = hasContactDetails || hasCollectionDetails || hasBankDetails;
  const detailSectionCount = [hasContactDetails, hasCollectionDetails, hasBankDetails].filter(Boolean).length;
  const detailGridColumns = detailSectionCount === 1
    ? 'sm:grid-cols-1 lg:grid-cols-1'
    : detailSectionCount === 2
      ? 'sm:grid-cols-2 lg:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-8 sm:gap-5">
      <PageHeader
        title="Supplier profile"
        breadcrumbs={[{ label: 'Suppliers', path: '/suppliers' }, { label: supplier.name }]}
      />

      {/* Supplier overview: show only fields that actually have values. */}
      <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={supplier.name} className="size-10 shrink-0 text-sm sm:size-11" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="max-w-full break-words text-base font-semibold leading-5 tracking-tight text-slate-900 sm:text-lg">
                    {supplier.name}
                  </h1>
                  <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
                </div>
                {hasValue(supplier.joiningDate) ? (
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-xs">
                    Supplier since {formatDate(supplier.joiningDate)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:shrink-0 sm:gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
                className="min-h-9 gap-1 px-2 text-[11px] sm:px-3 sm:text-xs"
              >
                <Pencil className="size-3.5 shrink-0" aria-hidden="true" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPaymentOpen(true)}
                className="min-h-9 gap-1 px-2 text-[11px] sm:px-3 sm:text-xs"
              >
                <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
                Payment
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setAdjustmentOpen(true)}
                className="min-h-9 gap-1 px-2 text-[11px] sm:px-3 sm:text-xs"
              >
                <CreditCard className="size-3.5 shrink-0" aria-hidden="true" />
                Adjust
              </Button>
            </div>
          </div>

          {(due !== null || defaultRate !== null) ? (
            <div className="flex flex-wrap items-center gap-2 border-y border-slate-100 bg-slate-50/70 px-3 py-2.5 sm:px-4">
              {due !== null ? (
                <div className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5">
                  <span className="text-[10px] font-medium text-slate-500">Outstanding</span>
                  <span className={cn('text-xs font-semibold tabular-nums', due > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                    {formatCurrency(due)}
                  </span>
                  {due <= 0 ? <span className="text-[9px] font-medium text-emerald-600">Settled</span> : null}
                </div>
              ) : null}
              {defaultRate !== null ? (
                <div className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5">
                  <span className="text-[10px] font-medium text-slate-500">Default rate</span>
                  <span className="text-xs font-semibold tabular-nums text-slate-800">{formatCurrency(defaultRate)}/L</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {hasAnyProfileDetails ? (
            <div className={cn('grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:p-3.5', detailGridColumns)}>
              {hasContactDetails ? (
                <DetailSection title="Contact" icon={Phone}>
                  <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                    {phone ? (
                      <InfoValue label="Phone">
                        <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-slate-800 hover:text-primary hover:underline">
                          <Phone className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="break-all">{phone}</span>
                        </a>
                      </InfoValue>
                    ) : null}
                    {email ? (
                      <InfoValue label="Email">
                        <a href={`mailto:${email}`} className="break-all text-slate-800 hover:text-primary hover:underline">
                          {email}
                        </a>
                      </InfoValue>
                    ) : null}
                    {(location || pincode) ? (
                      <InfoValue label="Address" className="sm:col-span-2">
                        <span className="inline-flex items-start gap-1">
                          <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" aria-hidden="true" />
                          <span>{[location, pincode].filter(Boolean).join(' · ')}</span>
                        </span>
                      </InfoValue>
                    ) : null}
                  </div>
                </DetailSection>
              ) : null}

              {hasCollectionDetails ? (
                <DetailSection title="Collection setup" icon={Clock}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {morningQty !== null ? <InfoValue label="Morning quantity">{morningQty} L</InfoValue> : null}
                    {eveningQty !== null ? <InfoValue label="Evening quantity">{eveningQty} L</InfoValue> : null}
                    {sessions.length ? (
                      <InfoValue label="Collection sessions" className="col-span-2">
                        {sessions.map((session) => `${String(session).charAt(0).toUpperCase()}${String(session).slice(1)}`).join(' · ')}
                      </InfoValue>
                    ) : null}
                  </div>
                </DetailSection>
              ) : null}

              {hasBankDetails ? (
                <DetailSection title="Bank details" icon={CreditCard}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {bankHolder ? <InfoValue label="Account holder" className="col-span-2">{bankHolder}</InfoValue> : null}
                    {bankName ? <InfoValue label="Bank name">{bankName}</InfoValue> : null}
                    {bankIfsc ? <InfoValue label="IFSC"><span className="uppercase">{bankIfsc}</span></InfoValue> : null}
                    {bankAccount ? <InfoValue label="Account number" className="col-span-2"><span className="break-all">{bankAccount}</span></InfoValue> : null}
                  </div>
                </DetailSection>
              ) : null}
            </div>
          ) : null}

          {notes ? (
            <div className="border-t border-slate-100 px-3 py-2.5 sm:px-4">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">Notes</p>
              <p className="whitespace-pre-wrap break-words text-xs leading-4 text-slate-600">{notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Passbook grouped by month. The month control selects and expands one group. */}
      <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Transactions</h2>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-9 shrink-0 rounded-xl"
                onClick={() => navigateMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>

              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 w-full min-w-[190px] justify-center gap-2 rounded-xl px-3 sm:w-auto"
                  aria-label={`Selected month: ${selectedMonthLabel}. Choose month and year`}
                  aria-expanded={monthPickerOpen}
                  aria-haspopup="dialog"
                  onClick={() => setMonthPickerOpen((open) => !open)}
                >
                  <Calendar className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="truncate">{selectedMonthLabel}</span>
                  <ChevronRight className={cn('size-3.5 shrink-0 rotate-90 text-slate-400 transition-transform', monthPickerOpen && '-rotate-90')} aria-hidden="true" />
                </Button>
                {monthPickerOpen ? (
                  <div role="dialog" aria-label="Choose transaction month" className="absolute left-1/2 top-full z-30 mt-2 w-[min(19rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:left-auto sm:right-0 sm:translate-x-0">
                    <p className="mb-2 text-xs font-semibold text-slate-700">Go to month</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Month</span>
                        <Select
                          value={String(selectedMonthNumber)}
                          onChange={(event) => setSelectedMonth(`${selectedYear}-${String(Number(event.target.value)).padStart(2, '0')}`)}
                          aria-label="Month"
                        >
                          {Array.from({ length: 12 }, (_, index) => (
                            <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(2020, index, 1))}</option>
                          ))}
                        </Select>
                      </label>
                      <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Year</span>
                        <Select
                          value={String(selectedYear)}
                          onChange={(event) => setSelectedMonth(`${event.target.value}-${String(selectedMonthNumber).padStart(2, '0')}`)}
                          aria-label="Year"
                        >
                          {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                        </Select>
                      </label>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setMonthPickerOpen(false)}>Close</Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-9 shrink-0 rounded-xl"
                onClick={() => navigateMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="p-3 sm:p-5">
            {passbookLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="size-9 rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-slate-100" />
                      <div className="h-2.5 w-1/5 rounded bg-slate-100" />
                    </div>
                    <div className="h-4 w-16 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : selectedMonthEntries.length ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5 sm:px-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{selectedMonthLabel}</p>
                    <p className="text-[11px] text-slate-500">{selectedMonthEntries.length} {selectedMonthEntries.length === 1 ? 'transaction' : 'transactions'}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Selected month</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedMonthEntries.map((entry, index) => (
                    <TransactionRow key={entry.id ?? `${String(entry.date)}-${index}`} entry={entry} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-9 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Calendar className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-800">No transactions in {selectedMonthLabel}</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Payments and adjustments recorded during this month will appear here.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit supplier drawer. */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
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
                collectionSessions: (Array.isArray(supplier.collectionSessions)
                  ? supplier.collectionSessions
                  : ['morning']) as ('morning' | 'evening')[],
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

      {/* Payment drawer. */}
      <Sheet open={paymentOpen} onOpenChange={setPaymentOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Record payment</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <RecordPaymentSection supplierId={supplierId} onSuccess={() => setPaymentOpen(false)} />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Adjustment drawer. */}
      <Sheet open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Record adjustment</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <AdjustmentSection supplierId={supplierId} onSuccess={() => setAdjustmentOpen(false)} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
