import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  useSuppliersLite,
  useUpdatePayment,
} from './hooks';
import { adjustSchema, type AdjustInput } from './schemas';
import { CustomerPaymentForm } from './components/customer-payment-form';
import { CustomerBalanceCard } from './components/customer-payment-table';
import { SupplierPaymentForm } from './components/supplier-payment-form';
import { SupplierPaymentCard } from './components/supplier-payment-table';

type BalanceFilter = 'all' | 'due' | 'advance' | 'zero';

function balanceOfCustomer(c: Customer): number {
  return Number(c.accountBalance ?? 0);
}

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
    defaultValues: { userId: getId(customer), type: 'credit_adjustment', amount: 0, date: todayLocal(), notes: '' },
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
        onSuccess: () => onSuccess(),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Adjustment type" required error={errors.type?.message}>
        <Select {...register('type')} className="min-h-11">
          <option value="credit_adjustment">Credit adjustment (reduces due)</option>
          <option value="debit_adjustment">Debit adjustment (increases due)</option>
        </Select>
      </FormField>
      <FormField label="Amount" required error={errors.amount?.message}>
        <Input type="number" min={0} step="0.01" placeholder="0.00" {...register('amount')} className="min-h-11" />
      </FormField>
      <FormField label="Date" required error={errors.date?.message}>
        <Input type="date" {...register('date')} className="min-h-11" />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea placeholder="Reason for adjustment" {...register('notes')} />
      </FormField>
      <DialogFooter>
        <Button type="submit" loading={isSubmitting || recordAdjustment.isPending} className="min-h-11">
          Save adjustment
        </Button>
      </DialogFooter>
    </form>
  );
}

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
  } = useForm<{ amount: number; date: string; notes: string }>({
    defaultValues: {
      amount: Number(entry.amount ?? 0),
      date: String(entry.date ?? '').slice(0, 10),
      notes: entry.notes ?? '',
    },
  });
  const updatePayment = useUpdatePayment();
  const refId = String(entry.referenceId ?? entry.id ?? '');

  const onSubmit = (values: { amount: number; date: string; notes: string }) => {
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
        onSuccess: () => onSuccess(),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Amount" required error={errors.amount?.message}>
        <Input type="number" min={0} step="0.01" {...register('amount', { valueAsNumber: true })} className="min-h-11" />
      </FormField>
      <FormField label="Date" required error={errors.date?.message}>
        <Input type="date" {...register('date')} className="min-h-11" />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea {...register('notes')} />
      </FormField>
      <DialogFooter>
        <Button type="submit" loading={isSubmitting || updatePayment.isPending} className="min-h-11">
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'supplier' ? 'supplier' : 'customer';
  const search = searchParams.get('search') ?? '';
  const balanceFilter = (searchParams.get('balance') ?? 'all') as BalanceFilter;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const debouncedSearch = useDebounce(search);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const [collectCustomer, setCollectCustomer] = useState<Customer | null>(null);
  const [adjustCustomer, setAdjustCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LedgerEntry | null>(null);
  const [recordSupplierOpen, setRecordSupplierOpen] = useState(false);

  const customersQuery = useCustomersWithBalance({
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  });
  const suppliersQuery = useSupplierPayments({
    search: tab === 'supplier' && debouncedSearch ? debouncedSearch : undefined,
    page,
    limit: 20,
  });
  const suppliersLiteQuery = useSuppliersLite();
  const historyQuery = usePassbook(historyCustomer ? getId(historyCustomer) : '', Boolean(historyCustomer));
  const deletePayment = useDeletePayment();

  const customers = useMemo(() => customersQuery.data?.items ?? [], [customersQuery.data]);
  const filteredCustomers = useMemo(() => {
    if (balanceFilter === 'all') return customers;
    return customers.filter((c) => {
      const b = balanceOfCustomer(c);
      if (balanceFilter === 'due') return b > 0;
      if (balanceFilter === 'advance') return b < 0;
      return b === 0;
    });
  }, [customers, balanceFilter]);

  const customerStats = useMemo(() => {
    let due = 0;
    let advances = 0;
    for (const c of customers) {
      const b = balanceOfCustomer(c);
      if (b > 0) due += b;
      else advances += Math.abs(b);
    }
    return { due, advances, count: customersQuery.data?.meta.total ?? customers.length };
  }, [customers, customersQuery.data]);

  const supplierPayments = useMemo(() => suppliersQuery.data?.items ?? [], [suppliersQuery.data]);
  const supplierStats = useMemo(() => {
    const suppliers = suppliersLiteQuery.data ?? [];
    let toPay = 0;
    for (const s of suppliers) {
      const outstanding = Number(s.outstandingAmount ?? 0);
      if (outstanding > 0) toPay += outstanding;
    }
    let totalPaid = 0;
    for (const p of supplierPayments) totalPaid += Number(p.amount ?? 0);
    return { toPay, totalPaid };
  }, [suppliersLiteQuery.data, supplierPayments]);

  const customerColumns: Column<Customer>[] = [
    {
      header: 'Customer',
      cell: (c) => (
        <div className="flex items-center gap-2">
          <Avatar name={c.name} className="size-8" />
          <div>
            <p className="font-medium text-slate-900">{c.name}</p>
            {c.phone ? <p className="text-xs text-slate-500">{c.phone}</p> : null}
          </div>
        </div>
      ),
    },
    {
      header: 'Balance',
      cell: (c) => {
        const b = balanceOfCustomer(c);
        return (
          <span className={`font-semibold ${b > 0 ? 'text-red-600' : b < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
            {formatCurrency(b)}
          </span>
        );
      },
    },
    {
      header: 'Total spent',
      cell: (c) => formatCurrency(c.totalSpent ?? 0),
    },
    {
      header: 'Actions',
      cell: (c) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => setCollectCustomer(c)}>
            Collect
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdjustCustomer(c)}>
            Adjust
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setHistoryCustomer(c)}>
            History
          </Button>
        </div>
      ),
    },
  ];

  const supplierColumns: Column<SupplierPayment>[] = [
    {
      header: 'Supplier',
      cell: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.supplierName ?? getName(p.supplierId, 'Supplier')}</p>
          <p className="text-xs text-slate-500">{shortId(getId(p))}</p>
        </div>
      ),
    },
    {
      header: 'Period',
      cell: (p) =>
        p.fromDate || p.toDate
          ? `${p.fromDate ? formatDate(p.fromDate) : '—'} → ${p.toDate ? formatDate(p.toDate) : '—'}`
          : '—',
    },
    {
      header: 'Amount',
      cell: (p) => <span className="font-semibold">{formatCurrency(p.amount)}</span>,
    },
    {
      header: 'Method',
      cell: (p) => (p.paymentMethod ? <StatusBadge status={p.paymentMethod} /> : '—'),
    },
    {
      header: 'Date',
      cell: (p) => formatDate(p.date ?? p.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Payments"
        description="Collect customer payments and pay suppliers"
        actions={
          tab === 'supplier' ? (
            <Button onClick={() => setRecordSupplierOpen(true)} className="min-h-11">
              Record supplier payment
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(v) => setParam('tab', v === 'supplier' ? 'supplier' : 'customer')}>
        <TabsList>
          <TabsTrigger value="customer">Customer Payments</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="customer">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Total due</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(customerStats.due)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Total advances</p>
                  <p className="text-lg font-semibold text-emerald-600">{formatCurrency(customerStats.advances)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Customers</p>
                  <p className="text-lg font-semibold text-slate-900">{customerStats.count}</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={(v) => setParam('search', v)}
                placeholder="Search customers…"
                className="sm:max-w-xs"
              />
              <Select
                value={balanceFilter}
                onChange={(e) => setParam('balance', e.target.value)}
                className="min-h-11 sm:w-48"
                aria-label="Balance filter"
              >
                <option value="all">All balances</option>
                <option value="due">Due</option>
                <option value="advance">Advance</option>
                <option value="zero">Settled</option>
              </Select>
            </div>

            <DataTable<Customer>
              data={filteredCustomers}
              columns={customerColumns}
              keyExtractor={(c) => getId(c)}
              loading={customersQuery.isPending}
              error={customersQuery.isError ? getErrorMessage(customersQuery.error) : null}
              onRetry={() => customersQuery.refetch()}
              emptyTitle="No customers found"
              emptyMessage="Try adjusting your search or balance filter."
              renderCard={(c) => (
                <CustomerBalanceCard
                  row={{ ...c, balance: balanceOfCustomer(c) }}
                  onCollect={() => setCollectCustomer(c)}
                  onAdjust={() => setAdjustCustomer(c)}
                  onHistory={() => setHistoryCustomer(c)}
                />
              )}
              page={page}
              totalPages={customersQuery.data?.meta.totalPages ?? 0}
              total={customersQuery.data?.meta.total ?? 0}
              onPageChange={(p) => setParam('page', String(p))}
            />
          </div>
        </TabsContent>

        <TabsContent value="supplier">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">To pay (outstanding)</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(supplierStats.toPay)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Total paid</p>
                  <p className="text-lg font-semibold text-emerald-600">{formatCurrency(supplierStats.totalPaid)}</p>
                </CardContent>
              </Card>
            </div>

            <SearchInput
              value={search}
              onChange={(v) => setParam('search', v)}
              placeholder="Search supplier payments…"
              className="sm:max-w-xs"
            />

            <DataTable<SupplierPayment>
              data={supplierPayments}
              columns={supplierColumns}
              keyExtractor={(p) => getId(p)}
              loading={suppliersQuery.isPending}
              error={suppliersQuery.isError ? getErrorMessage(suppliersQuery.error) : null}
              onRetry={() => suppliersQuery.refetch()}
              emptyTitle="No supplier payments found"
              emptyMessage="Record a supplier payment to get started."
              emptyActionLabel="Record payment"
              onEmptyAction={() => setRecordSupplierOpen(true)}
              renderCard={(p) => <SupplierPaymentCard payment={p} />}
              page={page}
              totalPages={suppliersQuery.data?.meta.totalPages ?? 0}
              total={suppliersQuery.data?.meta.total ?? 0}
              onPageChange={(p) => setParam('page', String(p))}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(collectCustomer)} onOpenChange={(open) => { if (!open) setCollectCustomer(null); }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Collect payment{collectCustomer ? ` — ${collectCustomer.name}` : ''}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {collectCustomer ? (
              <CustomerPaymentForm
                customerId={getId(collectCustomer)}
                defaultAmount={balanceOfCustomer(collectCustomer) > 0 ? balanceOfCustomer(collectCustomer) : undefined}
                onSuccess={() => setCollectCustomer(null)}
              />
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(adjustCustomer)} onOpenChange={(open) => { if (!open) setAdjustCustomer(null); }}>
        <DialogHeader>
          <DialogTitle>Adjust balance{adjustCustomer ? ` — ${adjustCustomer.name}` : ''}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {adjustCustomer ? (
            <AdjustCustomerForm customer={adjustCustomer} onSuccess={() => setAdjustCustomer(null)} />
          ) : null}
        </DialogBody>
      </Dialog>

      <Sheet open={Boolean(historyCustomer)} onOpenChange={(open) => { if (!open) { setHistoryCustomer(null); setEditingEntry(null); } }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Passbook{historyCustomer ? ` — ${historyCustomer.name}` : ''}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {historyQuery.isPending ? (
              <p className="text-sm text-slate-500">Loading passbook…</p>
            ) : historyQuery.isError ? (
              <p className="text-sm text-red-600">{getErrorMessage(historyQuery.error)}</p>
            ) : (historyQuery.data?.entries ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No entries yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(historyQuery.data?.entries ?? []).map((entry, i) => (
                  <div
                    key={String(entry.id ?? entry.referenceId ?? i)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{entry.description}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(entry.date)}
                        {entry.transactionId ? ` · ${entry.transactionId}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={entry.type === 'debit' ? 'danger' : 'success'}>
                        {entry.type === 'debit' ? '+' : '−'}{formatCurrency(entry.amount)}
                      </Badge>
                      {entry.isEditable ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditingEntry(entry)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingEntry(entry)}>
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(editingEntry)} onOpenChange={(open) => { if (!open) setEditingEntry(null); }}>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {editingEntry ? (
            <EditPassbookEntryForm entry={editingEntry} onSuccess={() => setEditingEntry(null)} />
          ) : null}
        </DialogBody>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingEntry)}
        onOpenChange={(open) => { if (!open) setDeletingEntry(null); }}
        title="Delete payment?"
        description="This will permanently delete this payment entry."
        confirmLabel="Delete"
        loading={deletePayment.isPending}
        onConfirm={() => {
          if (!deletingEntry) return;
          const id = String(deletingEntry.referenceId ?? deletingEntry.id ?? '');
          if (!id) {
            toast.error('Cannot delete this entry: missing reference');
            return;
          }
          deletePayment.mutate(id, { onSuccess: () => setDeletingEntry(null) });
        }}
      />

      <Sheet open={recordSupplierOpen} onOpenChange={setRecordSupplierOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Record supplier payment</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <SupplierPaymentForm onSuccess={() => setRecordSupplierOpen(false)} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
