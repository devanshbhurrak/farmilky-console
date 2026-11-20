
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  Plus,
  History,
  Users,
  Truck,
  Pencil,
  X,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable, type Column } from '@/components/data/data-table';
import {
  FilterButton,
  FilterDrawer,
  useFilterDrawer,
} from '@/components/data/filter-drawer';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { FormField } from '@/components/form/form-field';

import { useDebounce } from '@/hooks/use-debounce';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
  getId,
  getName,
  shortId,
  todayLocal,
} from '@/lib/utils';

import type { Customer, LedgerEntry } from '@/types/customer';
import type { SupplierPayment } from '@/types/payment';

import {
  useCustomersWithBalance,
  useDeletePayment,
  usePassbook,
  useRecordCustomerAdjustment,
  useSupplierPayments,
  useUpdatePayment,
} from './hooks';

import { adjustSchema, type AdjustInput } from './schemas';
import { CustomerPaymentForm } from './components/customer-payment-form';
import { CustomerBalanceCard } from './components/customer-payment-table';
import { SupplierPaymentForm } from './components/supplier-payment-form';
import { SupplierPaymentCard } from './components/supplier-payment-table';

type BalanceFilter = 'all' | 'due' | 'advance' | 'zero';

function getBalance(customer: Customer): number {
  const value = Number(customer.accountBalance ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function normalizeBalance(value: string | null): BalanceFilter {
  return value === 'due' || value === 'advance' || value === 'zero'
    ? value
    : 'all';
}

function normalizePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

/* -------------------------------------------------------
   BALANCE DISPLAY
------------------------------------------------------- */

function CustomerBalanceBadge({ balance }: { balance: number }) {
  if (balance > 0) {
    return (
      <Badge variant="warning" className="whitespace-nowrap">
        Due {formatCurrency(balance)}
      </Badge>
    );
  }

  if (balance < 0) {
    return (
      <Badge variant="success" className="whitespace-nowrap">
        Advance {formatCurrency(Math.abs(balance))}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="whitespace-nowrap">
      Settled
    </Badge>
  );
}

/* -------------------------------------------------------
   ADJUST CUSTOMER BALANCE
------------------------------------------------------- */

function AdjustCustomerForm({
  customer,
  onSuccess,
}: {
  customer: Customer;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdjustInput>({
    resolver: zodResolver(adjustSchema) as unknown as Resolver<AdjustInput>,
    defaultValues: {
      userId: getId(customer),
      type: 'credit_adjustment',
      amount: 0,
      date: todayLocal(),
      notes: '',
    },
  });

  const recordAdjustment = useRecordCustomerAdjustment();

  const onSubmit = (values: AdjustInput) => {
    recordAdjustment.mutate(
      {
        userId: getId(customer),
        type: values.type,
        amount: Number(values.amount),
        date: values.date,
        notes: values.notes || undefined,
      },
      {
        onSuccess,
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      <FormField label="Adjustment type" required error={errors.type?.message}>
        <Select {...register('type')} className="min-h-10">
          <option value="credit_adjustment">
            Credit adjustment (reduces due)
          </option>
          <option value="debit_adjustment">
            Debit adjustment (increases due)
          </option>
        </Select>
      </FormField>

      <FormField label="Amount" required error={errors.amount?.message}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          {...register('amount')}
          className="min-h-10"
        />
      </FormField>

      <FormField label="Date" required error={errors.date?.message}>
        <Input
          type="date"
          {...register('date')}
          className="min-h-10"
        />
      </FormField>

      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea
          rows={3}
          placeholder="Reason for this adjustment..."
          {...register('notes')}
        />
      </FormField>

      <DialogFooter>
        <Button
          type="submit"
          loading={isSubmitting || recordAdjustment.isPending}
          className="min-h-10 w-full sm:w-auto"
        >
          Save adjustment
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------
   EDIT PASSBOOK ENTRY
------------------------------------------------------- */

function EditPassbookEntryForm({
  entry,
  onSuccess,
}: {
  entry: LedgerEntry;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{
    amount: number;
    date: string;
    notes: string;
  }>({
    defaultValues: {
      amount: Number(entry.amount ?? 0),
      date: String(entry.date ?? '').slice(0, 10),
      notes: entry.notes ?? '',
    },
  });

  const updatePayment = useUpdatePayment();

  // The payments API is keyed by transaction id; `referenceId` may point at
  // the delivery/order that produced the entry instead.
  const refId = String(entry.id ?? '');

  const onSubmit = (values: {
    amount: number;
    date: string;
    notes: string;
  }) => {
    if (!refId) {
      toast.error('Missing payment reference');
      return;
    }

    updatePayment.mutate(
      {
        refId,
        data: {
          amount: Number(values.amount),
          date: values.date,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess,
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      <FormField label="Amount" required error={errors.amount?.message}>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          {...register('amount', {
            valueAsNumber: true,
            required: 'Amount is required',
            min: { value: 0.01, message: 'Enter an amount greater than zero' },
          })}
          className="min-h-10"
        />
      </FormField>

      <FormField label="Date" required error={errors.date?.message}>
        <Input
          type="date"
          {...register('date', { required: 'Date is required' })}
          className="min-h-10"
        />
      </FormField>

      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea
          rows={3}
          {...register('notes')}
          placeholder="Add a note..."
        />
      </FormField>

      <DialogFooter>
        <Button
          type="submit"
          loading={isSubmitting || updatePayment.isPending}
          className="min-h-10 w-full sm:w-auto"
        >
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------
   MAIN PAGE
------------------------------------------------------- */

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get('tab') === 'supplier' ? 'supplier' : 'customer';
  const search = searchParams.get('search') ?? '';
  const balanceFilter = normalizeBalance(searchParams.get('balance'));
  const page = normalizePage(searchParams.get('page'));

  const debouncedSearch = useDebounce(search, 350);

  // Preserve URL filters and reset pagination when necessary.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);

    const shouldDelete =
      !value ||
      value === 'all' ||
      (key === 'page' && value === '1') ||
      (key === 'tab' && value === 'customer');

    if (shouldDelete) next.delete(key);
    else next.set(key, value);

    if (key !== 'page') next.delete('page');

    setSearchParams(next, { replace: true });
  };

  const filters = useFilterDrawer({
    balance: balanceFilter,
  });

  // Payment actions
  const [collectCustomer, setCollectCustomer] = useState<Customer | null>(null);
  const [adjustCustomer, setAdjustCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LedgerEntry | null>(null);
  const [recordSupplierOpen, setRecordSupplierOpen] = useState(false);

  // Queries
  const customersQuery = useCustomersWithBalance({
    search: tab === 'customer' ? debouncedSearch || undefined : undefined,
    page,
    limit: 20,
  });

  const suppliersQuery = useSupplierPayments({
    search: tab === 'supplier' ? debouncedSearch || undefined : undefined,
    page,
    limit: 20,
  });

  const historyQuery = usePassbook(
    historyCustomer ? getId(historyCustomer) : '',
    Boolean(historyCustomer),
  );

  const deletePayment = useDeletePayment();

  const customers = useMemo(
    () => customersQuery.data?.items ?? [],
    [customersQuery.data],
  );

  // NOTE: Existing API only exposes the current page here.
  const filteredCustomers = useMemo(() => {
    if (balanceFilter === 'all') return customers;

    return customers.filter((customer) => {
      const balance = getBalance(customer);

      if (balanceFilter === 'due') return balance > 0;
      if (balanceFilter === 'advance') return balance < 0;

      return balance === 0;
    });
  }, [customers, balanceFilter]);

  const supplierPayments = useMemo(
    () => suppliersQuery.data?.items ?? [],
    [suppliersQuery.data],
  );

  // Contextual action in the application header.
  const headerAction = useMemo(
    () =>
      tab === 'supplier' ? (
        <Button
          size="sm"
          onClick={() => setRecordSupplierOpen(true)}
          className="h-9 gap-1.5 px-3"
        >
          <Plus className="size-4" />
          Record payment
        </Button>
      ) : null,
    [tab],
  );

  useRegisterHeaderAction(headerAction);

  // -----------------------------------------------------
  // CUSTOMER COLUMNS
  // -----------------------------------------------------

  const customerColumns: Column<Customer>[] = [
    {
      header: 'Customer',
      cell: (customer) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={customer.name} className="size-9 shrink-0" />

          <div className="min-w-0">
            <p className="max-w-[220px] truncate text-sm font-semibold text-foreground">
              {customer.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {customer.phone || 'No phone number'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Balance',
      cell: (customer) => (
        <CustomerBalanceBadge balance={getBalance(customer)} />
      ),
    },
    {
      header: 'Total spent',
      cell: (customer) => (
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {formatCurrency(customer.totalSpent ?? 0)}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (customer) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => setCollectCustomer(customer)}
          >
            <Wallet className="size-3.5" />
            Collect
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0"
            aria-label={`Adjust balance for ${customer.name}`}
            title="Adjust balance"
            onClick={() => setAdjustCustomer(customer)}
          >
            <Pencil className="size-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0"
            aria-label={`View passbook for ${customer.name}`}
            title="View passbook"
            onClick={() => setHistoryCustomer(customer)}
          >
            <History className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  // -----------------------------------------------------
  // SUPPLIER COLUMNS
  // -----------------------------------------------------

  const supplierColumns: Column<SupplierPayment>[] = [
    {
      header: 'Supplier',
      cell: (payment) => (
        <div className="min-w-0">
          <p className="max-w-[220px] truncate text-sm font-semibold text-foreground">
            {payment.supplierName ?? getName(payment.supplierId, 'Supplier')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {shortId(getId(payment))}
          </p>
        </div>
      ),
    },
    {
      header: 'Period',
      cell: (payment) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {payment.fromDate || payment.toDate
            ? `${payment.fromDate ? formatDate(payment.fromDate) : '—'} → ${
                payment.toDate ? formatDate(payment.toDate) : '—'
              }`
            : '—'}
        </span>
      ),
    },
    {
      header: 'Amount',
      cell: (payment) => (
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
    {
      header: 'Method',
      cell: (payment) => (
        payment.paymentMethod
          ? <StatusBadge status={payment.paymentMethod} />
          : <span className="text-muted-foreground">—</span>
      ),
    },
    {
      header: 'Date',
      cell: (payment) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDate(payment.date ?? payment.createdAt)}
        </span>
      ),
    },
  ];

  const customerTotal = customersQuery.data?.meta.total ?? 0;
  const supplierTotal = suppliersQuery.data?.meta.total ?? 0;

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-4 pb-6 sm:gap-5">

      {/* WORKFLOW TABS */}
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setParam('tab', value === 'supplier' ? 'supplier' : 'customer')
        }
        className="w-full min-w-0"
      >
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl p-1 sm:w-fit sm:min-w-[360px]">
          <TabsTrigger
            value="customer"
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs sm:px-5 sm:text-sm"
          >
            <Users className="size-4 shrink-0" />
            <span>Customer payments</span>
          </TabsTrigger>

          <TabsTrigger
            value="supplier"
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs sm:px-5 sm:text-sm"
          >
            <Truck className="size-4 shrink-0" />
            <span>Supplier payments</span>
          </TabsTrigger>
        </TabsList>

        {/* ===============================================
            CUSTOMER PAYMENTS
        ================================================ */}

        <TabsContent
          value="customer"
          className="mt-4 space-y-3 outline-none sm:mt-5 sm:space-y-4"
        >
          {/* CUSTOMER TOOLBAR */}
          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <SearchInput
                  value={search}
                  onChange={(value) => setParam('search', value)}
                  placeholder="Search customer name or phone..."
                  className="w-full"
                />
              </div>

              <div className="shrink-0 md:hidden">
                <FilterButton
                  activeCount={balanceFilter === 'all' ? 0 : 1}
                  onClick={filters.openDrawer}
                />
              </div>
            </div>

            {/* DESKTOP FILTER */}
            <div className="hidden w-[190px] shrink-0 md:block">
              <Select
                value={balanceFilter}
                onChange={(event) => setParam('balance', event.target.value)}
                aria-label="Filter customer balances"
              >
                <option value="all">All balances</option>
                <option value="due">Outstanding due</option>
                <option value="advance">Advance</option>
                <option value="zero">Settled</option>
              </Select>
            </div>
          </div>

          {/* ACTIVE FILTER */}
          {balanceFilter !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtered by</span>
              <button
                type="button"
                onClick={() => setParam('balance', 'all')}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-muted/50 px-2 text-xs font-medium transition-colors hover:bg-muted"
              >
                Balance: {
                  balanceFilter === 'due'
                    ? 'Due'
                    : balanceFilter === 'advance'
                      ? 'Advance'
                      : 'Settled'
                }
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* MOBILE FILTER DRAWER */}
          <FilterDrawer
            open={filters.open}
            onOpenChange={filters.setOpen}
            activeCount={balanceFilter === 'all' ? 0 : 1}
            onApply={() => {
              setParam('balance', filters.draft.balance);
              filters.setOpen(false);
            }}
            onReset={() => filters.setDraft({ balance: 'all' })}
          >
            <FormField label="Customer balance">
              <Select
                value={filters.draft.balance}
                onChange={(event) =>
                  filters.setField('balance', event.target.value as BalanceFilter)
                }
                className="min-h-10"
                aria-label="Customer balance"
              >
                <option value="all">All balances</option>
                <option value="due">Outstanding due</option>
                <option value="advance">Advance</option>
                <option value="zero">Settled</option>
              </Select>
            </FormField>
          </FilterDrawer>

          {/* LIST HEADER */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className="text-sm font-semibold text-foreground">
              Customer accounts
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {customerTotal.toLocaleString('en-IN')} customers
            </span>
          </div>

          {/* CUSTOMER TABLE / CARDS */}
          <div className="min-w-0">
            <DataTable<Customer>
              data={filteredCustomers}
              columns={customerColumns}
              keyExtractor={(customer) => getId(customer)}
              loading={customersQuery.isPending}
              error={
                customersQuery.isError
                  ? getErrorMessage(customersQuery.error)
                  : null
              }
              onRetry={() => customersQuery.refetch()}
              emptyTitle="No customers found"
              emptyMessage="Try adjusting your search or balance filter."
              emptyIcon={<Wallet className="size-6" />}
              renderCard={(customer) => (
                <CustomerBalanceCard
                  row={{
                    ...customer,
                    balance: getBalance(customer),
                  }}
                  onCollect={() => setCollectCustomer(customer)}
                  onAdjust={() => setAdjustCustomer(customer)}
                  onHistory={() => setHistoryCustomer(customer)}
                />
              )}
              page={customersQuery.data?.meta.page ?? page}
              totalPages={customersQuery.data?.meta.totalPages ?? 0}
              total={customerTotal}
              onPageChange={(nextPage) =>
                setParam('page', String(nextPage))
              }
            />
          </div>
        </TabsContent>

        {/* ===============================================
            SUPPLIER PAYMENTS
        ================================================ */}

        <TabsContent
          value="supplier"
          className="mt-4 space-y-3 outline-none sm:mt-5 sm:space-y-4"
        >
          {/* SUPPLIER TOOLBAR */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <SearchInput
                value={search}
                onChange={(value) => setParam('search', value)}
                placeholder="Search supplier or payment..."
                className="w-full"
              />
            </div>
          </div>

          {/* LIST HEADER */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className="text-sm font-semibold text-foreground">
              Supplier transactions
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {supplierTotal.toLocaleString('en-IN')} payments
            </span>
          </div>

          {/* SUPPLIER TABLE / CARDS */}
          <div className="min-w-0">
            <DataTable<SupplierPayment>
              data={supplierPayments}
              columns={supplierColumns}
              keyExtractor={(payment) => getId(payment)}
              loading={suppliersQuery.isPending}
              error={
                suppliersQuery.isError
                  ? getErrorMessage(suppliersQuery.error)
                  : null
              }
              onRetry={() => suppliersQuery.refetch()}
              emptyTitle="No supplier payments found"
              emptyMessage="Record a supplier payment to get started."
              emptyIcon={<Wallet className="size-6" />}
              emptyActionLabel="Record payment"
              onEmptyAction={() => setRecordSupplierOpen(true)}
              renderCard={(payment) => (
                <SupplierPaymentCard payment={payment} />
              )}
              page={suppliersQuery.data?.meta.page ?? page}
              totalPages={suppliersQuery.data?.meta.totalPages ?? 0}
              total={supplierTotal}
              onPageChange={(nextPage) =>
                setParam('page', String(nextPage))
              }
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ===============================================
          COLLECT PAYMENT
      ================================================ */}

      <Sheet
        open={Boolean(collectCustomer)}
        onOpenChange={(open) => {
          if (!open) setCollectCustomer(null);
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle className="pr-8">
              Collect payment
              {collectCustomer ? ` — ${collectCustomer.name}` : ''}
            </SheetTitle>
          </SheetHeader>
          <SheetBody>
            {collectCustomer && (
              <CustomerPaymentForm
                customerId={getId(collectCustomer)}
                defaultAmount={
                  getBalance(collectCustomer) > 0
                    ? getBalance(collectCustomer)
                    : undefined
                }
                onSuccess={() => setCollectCustomer(null)}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ADJUST BALANCE */}
      <Dialog
        open={Boolean(adjustCustomer)}
        onOpenChange={(open) => {
          if (!open) setAdjustCustomer(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pr-6">
              Adjust balance
              {adjustCustomer ? ` — ${adjustCustomer.name}` : ''}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {adjustCustomer && (
              <AdjustCustomerForm
                customer={adjustCustomer}
                onSuccess={() => setAdjustCustomer(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ===============================================
          PASSBOOK
      ================================================ */}

      <Sheet
        open={Boolean(historyCustomer)}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryCustomer(null);
            setEditingEntry(null);
            setDeletingEntry(null);
          }
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle className="pr-8">
              Passbook
              {historyCustomer ? ` — ${historyCustomer.name}` : ''}
            </SheetTitle>
          </SheetHeader>

          <SheetBody>
            {historyQuery.isPending ? (
              <div className="space-y-3 py-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : historyQuery.isError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-destructive">
                  {getErrorMessage(historyQuery.error)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => historyQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : (historyQuery.data?.entries ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <div className="flex size-11 items-center justify-center rounded-full bg-muted">
                  <History className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs text-muted-foreground">
                  Customer transactions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(historyQuery.data?.entries ?? []).map((entry, index) => {
                  const isDebit = entry.type === 'debit';

                  return (
                    <article
                      key={String(entry.id ?? entry.referenceId ?? index)}
                      className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                            isDebit
                              ? 'bg-red-50 text-red-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {isDebit ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-foreground">
                            {entry.description}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(entry.date)}
                            {entry.transactionId
                              ? ` · ${entry.transactionId}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                        <Badge
                          variant={isDebit ? 'danger' : 'success'}
                          className="whitespace-nowrap"
                        >
                          {isDebit ? '+' : '−'}
                          {formatCurrency(entry.amount)}
                        </Badge>

                        {entry.isEditable && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 px-2.5 text-xs"
                              onClick={() => setEditingEntry(entry)}
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeletingEntry(entry)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* EDIT PASSBOOK ENTRY */}
      <Dialog
        open={Boolean(editingEntry)}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {editingEntry && (
              <EditPassbookEntryForm
                entry={editingEntry}
                onSuccess={() => setEditingEntry(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* DELETE PAYMENT */}
      <ConfirmDialog
        open={Boolean(deletingEntry)}
        onOpenChange={(open) => {
          if (!open) setDeletingEntry(null);
        }}
        title="Delete payment?"
        description="This payment entry will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete payment"
        loading={deletePayment.isPending}
        onConfirm={() => {
          if (!deletingEntry) return;

          const id = String(deletingEntry.id ?? '');

          if (!id) {
            toast.error('Missing payment reference');
            return;
          }

          deletePayment.mutate(id, {
            onSuccess: () => setDeletingEntry(null),
            onError: (error) => toast.error(getErrorMessage(error)),
          });
        }}
      />

      {/* RECORD SUPPLIER PAYMENT */}
      <Sheet
        open={recordSupplierOpen}
        onOpenChange={setRecordSupplierOpen}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Record supplier payment</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <SupplierPaymentForm
              onSuccess={() => setRecordSupplierOpen(false)}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </main>
  );
}
