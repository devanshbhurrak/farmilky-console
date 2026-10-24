import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FilterBar } from '@/components/data/filter-bar';
import type { ActiveFilter } from '@/components/data/filter-bar';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FormField } from '@/components/form/form-field';
import { formatCurrency, formatDate, getErrorMessage, getId, todayLocal } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useCreateOrder, useInstantDelivery, useOrders } from './hooks';
import { OrderForm } from './components/order-form';
import { OrderCard, orderCustomerName, orderStatusOf } from './components/order-table';
import type { CreateOrderInput } from './schemas';
import type { Order } from '@/types/order';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deliverImmediately, setDeliverImmediately] = React.useState(false);

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? 'all';
  const paymentStatus = params.get('paymentStatus') ?? 'all';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 1) || 1;
  const debouncedSearch = useDebounce(search, 400);

  const filters = useFilterDrawer({ status, paymentStatus, from, to, sort });

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all' || (k === 'page' && v === '1')) sp.delete(k);
      else sp.set(k, v);
    }
    setParams(sp, { replace: true });
  }

  const { data, isLoading, error, refetch } = useOrders({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status !== 'all' ? status : undefined,
    paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const createMutation = useCreateOrder();
  const instantMutation = useInstantDelivery();
  const saving = createMutation.isPending || instantMutation.isPending;

  const createAction = React.useMemo(
    () => (
      <Button onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-sm">
        <Plus aria-hidden /> Order
      </Button>
    ),
    [setCreateOpen]
  );
  useRegisterHeaderAction(createAction);

  const sorted = React.useMemo(() => {
    const items = [...(data?.items ?? [])];
    if (sort === 'oldest') items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else if (sort === 'amount-desc') items.sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
    else items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }, [data, sort]);

  const activeFilters: ActiveFilter[] = [];
  if (status !== 'all') activeFilters.push({ key: 'status', label: 'Status', value: status });
  if (paymentStatus !== 'all') activeFilters.push({ key: 'paymentStatus', label: 'Payment', value: paymentStatus });
  if (from) activeFilters.push({ key: 'from', label: 'From', value: from });
  if (to) activeFilters.push({ key: 'to', label: 'To', value: to });

  const columns: Column<Order>[] = [
    {
      header: 'Customer',
      cell: (o) => (
        <button onClick={() => navigate(`/orders/${getId(o)}`)} className="text-left font-medium text-slate-900 hover:underline">
          {orderCustomerName(o)}
        </button>
      ),
    },
    {
      header: 'Date',
      cell: (o) => <span className="whitespace-nowrap">{formatDate(o.orderDate ?? o.createdAt)}</span>,
    },
    {
      header: 'Amount',
      cell: (o) => <span className="font-semibold whitespace-nowrap">{formatCurrency(o.totalAmount)}</span>,
    },
    {
      header: 'Payment',
      cell: (o) => (
        <span className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 uppercase">{String(o.paymentMethod)}</span>
          <StatusBadge status={String(o.paymentStatus ?? 'pending')} />
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (o) => <StatusBadge status={orderStatusOf(o)} />,
    },
  ];

  async function handleSubmit(values: CreateOrderInput) {
    const payload = {
      ...values,
      deliveryDate: values.deliveryDate || undefined,
      notes: values.notes || undefined,
      address:
        values.address?.street || values.address?.city || values.address?.pincode
          ? values.address
          : undefined,
    };
    if (deliverImmediately) await instantMutation.mutateAsync(payload);
    else await createMutation.mutateAsync(payload);
    setCreateOpen(false);
    setDeliverImmediately(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Orders" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SearchInput value={search} onChange={(v) => update({ search: v, page: '1' })} placeholder="Search orders…" className="flex-1" />
          <FilterButton activeCount={activeFilters.length} onClick={filters.openDrawer} />
        </div>
        <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:grid">
          <Select value={status} onChange={(e) => update({ status: e.target.value, page: '1' })} aria-label="Status filter">
            <option value="all">All statuses</option>
            <option value="placed">Placed</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select value={paymentStatus} onChange={(e) => update({ paymentStatus: e.target.value, page: '1' })} aria-label="Payment status filter">
            <option value="all">Any payment</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </Select>
          <Input type="date" value={from} max={todayLocal()} onChange={(e) => update({ from: e.target.value, page: '1' })} aria-label="From date" />
          <Input type="date" value={to} max={todayLocal()} onChange={(e) => update({ to: e.target.value, page: '1' })} aria-label="To date" />
          <Select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort orders">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
          </Select>
        </div>
      </div>

      <FilterDrawer
        open={filters.open}
        onOpenChange={filters.setOpen}
        activeCount={activeFilters.length}
        onApply={() => {
          update({
            status: filters.draft.status,
            paymentStatus: filters.draft.paymentStatus,
            from: filters.draft.from,
            to: filters.draft.to,
            sort: filters.draft.sort,
            page: '1',
          });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: 'all', paymentStatus: 'all', from: '', to: '', sort: 'newest' })}
      >
        <FormField label="Order status">
          <Select value={filters.draft.status} onChange={(e) => filters.setField('status', e.target.value)} aria-label="Status filter">
            <option value="all">All statuses</option>
            <option value="placed">Placed</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>
        <FormField label="Payment status">
          <Select value={filters.draft.paymentStatus} onChange={(e) => filters.setField('paymentStatus', e.target.value)} aria-label="Payment status filter">
            <option value="all">Any payment</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="From date">
            <Input type="date" value={filters.draft.from} max={todayLocal()} onChange={(e) => filters.setField('from', e.target.value)} aria-label="From date" />
          </FormField>
          <FormField label="To date">
            <Input type="date" value={filters.draft.to} max={todayLocal()} onChange={(e) => filters.setField('to', e.target.value)} aria-label="To date" />
          </FormField>
        </div>
        <FormField label="Sort by">
          <Select value={filters.draft.sort} onChange={(e) => filters.setField('sort', e.target.value)} aria-label="Sort orders">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
          </Select>
        </FormField>
      </FilterDrawer>

      <FilterBar
        filters={activeFilters}
        onRemove={(key) => update({ [key]: 'all', page: '1' })}
        onClearAll={() => update({ status: 'all', paymentStatus: 'all', from: '', to: '', page: '1' })}
      />

      <DataTable<Order>
        data={sorted}
        columns={columns}
        keyExtractor={(o, i) => getId(o) || `order-${i}`}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => refetch()}
        emptyTitle="No orders found"
        emptyMessage="Try adjusting your filters, or create a new order."
        emptyIcon={<ShoppingCart className="size-6" />}
        emptyActionLabel="New order"
        onEmptyAction={() => setCreateOpen(true)}
        renderCard={(o) => <OrderCard order={o} onClick={(ord) => navigate(`/orders/${getId(ord)}`)} />}
        page={page}
        totalPages={data?.meta.totalPages ?? 0}
        total={data?.meta.total ?? 0}
        onPageChange={(p) => update({ page: String(p) })}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>New order</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <FormField label="Fulfilment">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
                <Checkbox checked={deliverImmediately} onChange={(e) => setDeliverImmediately(e.target.checked)} />
                Deliver immediately (instant delivery)
              </label>
            </FormField>
            <OrderForm onSubmit={handleSubmit} submitting={saving} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
