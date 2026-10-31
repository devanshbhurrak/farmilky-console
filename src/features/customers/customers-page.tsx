import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FilterBar } from '@/components/data/filter-bar';
import type { ActiveFilter } from '@/components/data/filter-bar';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { FormField } from '@/components/form/form-field';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate, getErrorMessage, getId } from '@/lib/utils';
import type { Area } from '@/types/area';
import type { Customer } from '@/types/customer';
import { customersApi } from './api';
import { customerBalance, enrichCustomersArea } from './customer-utils';
import { CustomerForm } from './components/customer-form';
import type { AreaOption } from './components/customer-form';
import { CustomerCard } from './components/customer-table';
import { useCreateCustomer, useCustomers } from './hooks';
import type { CreateCustomerInput } from './schemas';

function toAreaOptions(items: Area[]): AreaOption[] {
  return items.map((area) => ({ id: getId(area) || area.id, name: area.name }));
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(false);

  const search = params.get('search') ?? '';
  const rawStatus = params.get('status');
  const status = rawStatus === 'active' || rawStatus === 'inactive' ? rawStatus : 'all';
  const rawBalance = params.get('balance');
  const balanceFilter = rawBalance === 'due' || rawBalance === 'clear' ? rawBalance : 'all';
  const rawSort = params.get('sort');
  const sort =
    rawSort === 'oldest' || rawSort === 'name' || rawSort === 'highest-due'
      ? rawSort
      : 'newest';
  const parsedPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const debouncedSearch = useDebounce(search, 400);

  const filters = useFilterDrawer({ status, balance: balanceFilter, sort });
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === 'all' || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const query = useCustomers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    balance:
      balanceFilter === 'due'
        ? 'positive'
        : balanceFilter === 'clear'
          ? 'non_positive'
          : undefined,
    sortBy:
      sort === 'name'
        ? 'name'
        : sort === 'highest-due'
          ? 'accountBalance'
          : 'createdAt',
    sortOrder: sort === 'oldest' || sort === 'name' ? 'asc' : 'desc',
  });
  const createMutation = useCreateCustomer();

  const { data: areasRes } = useQuery({
    queryKey: queryKeys.areas.list(),
    queryFn: () => customersApi.areasLite(),
  });
  const areas = React.useMemo(() => toAreaOptions(areasRes ?? []), [areasRes]);
  const customers = React.useMemo(
    () => enrichCustomersArea(query.data?.items ?? [], areas),
    [query.data?.items, areas],
  );

  const createAction = React.useMemo(
    () => (
      <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-sm min-h-[36px]">
        <Plus aria-hidden /> Add Customer
      </Button>
    ),
    [setCreateOpen],
  );
  useRegisterHeaderAction(createAction);

  const activeFilters: ActiveFilter[] = [];
  if (status !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: status === 'active' ? 'Active' : 'Inactive',
    });
  }
  if (balanceFilter !== 'all') {
    activeFilters.push({
      key: 'balance',
      label: 'Balance',
      value: balanceFilter === 'due' ? 'Due' : 'Clear',
    });
  }
  if (sort !== 'newest') {
    activeFilters.push({
      key: 'sort',
      label: 'Sort',
      value: sort === 'oldest' ? 'Oldest first' : sort === 'name' ? 'Name A–Z' : 'Highest due',
    });
  }

  const columns: Column<Customer>[] = [
    {
      header: 'Customer',
      cell: (customer) => (
        <button
          type="button"
          onClick={() => navigate(`/customers/${getId(customer)}`)}
          className="flex items-center gap-3 text-left"
        >
          <Avatar name={customer.name} />
          <span>
            <span className="block font-medium text-slate-900 hover:underline">{customer.name}</span>
            <span className="block text-xs text-slate-500">{customer.phone ?? '—'}</span>
          </span>
        </button>
      ),
    },
    {
      header: 'Area',
      cell: (customer) =>
        customer.deliveryConfig?.assignedAreaName ?? customer.areaName ?? '—',
    },
    {
      header: 'Balance',
      cell: (customer) => {
        const balance = customerBalance(customer);
        return (
          <Badge variant={balance > 0 ? 'warning' : 'success'}>
            {balance > 0 ? `Due ${formatCurrency(balance)}` : 'Clear'}
          </Badge>
        );
      },
    },
    {
      header: 'Since',
      cell: (customer) => (
        <span className="whitespace-nowrap">{formatDate(customer.createdAt)}</span>
      ),
    },
    {
      header: 'Status',
      cell: (customer) => (
        <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
      ),
    },
  ];

  async function handleCreate(values: CreateCustomerInput) {
    await createMutation.mutateAsync({
      ...values,
      email: values.email || undefined,
      address:
        values.address?.street || values.address?.city || values.address?.pincode
          ? values.address
          : undefined,
      deliveryConfig:
        values.deliveryConfig?.assignedArea ||
        values.deliveryConfig?.deliverySequence !== undefined
          ? values.deliveryConfig
          : undefined,
    });
    setCreateOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Customers" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SearchInput
            value={search}
            onChange={(value) => update({ search: value, page: '1' })}
            placeholder="Search name, phone, email…"
            className="flex-1"
          />
          <FilterButton activeCount={activeFilters.length} onClick={filters.openDrawer} />
        </div>
        <div className="hidden grid-cols-1 gap-3 sm:grid-cols-3 md:grid">
          <Select
            value={status}
            onChange={(event) => update({ status: event.target.value, page: '1' })}
            aria-label="Status filter"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select
            value={balanceFilter}
            onChange={(event) => update({ balance: event.target.value, page: '1' })}
            aria-label="Balance filter"
          >
            <option value="all">Any balance</option>
            <option value="due">Due</option>
            <option value="clear">Clear</option>
          </Select>
          <Select
            value={sort}
            onChange={(event) => update({ sort: event.target.value, page: '1' })}
            aria-label="Sort customers"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="highest-due">Highest due</option>
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
            balance: filters.draft.balance,
            sort: filters.draft.sort,
            page: '1',
          });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: 'all', balance: 'all', sort: 'newest' })}
      >
        <FormField label="Status">
          <Select
            value={filters.draft.status}
            onChange={(event) => filters.setField('status', event.target.value)}
            aria-label="Status filter"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Balance">
          <Select
            value={filters.draft.balance}
            onChange={(event) => filters.setField('balance', event.target.value)}
            aria-label="Balance filter"
          >
            <option value="all">Any balance</option>
            <option value="due">Due</option>
            <option value="clear">Clear</option>
          </Select>
        </FormField>
        <FormField label="Sort by">
          <Select
            value={filters.draft.sort}
            onChange={(event) => filters.setField('sort', event.target.value)}
            aria-label="Sort customers"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="highest-due">Highest due</option>
          </Select>
        </FormField>
      </FilterDrawer>

      <FilterBar
        filters={activeFilters}
        onRemove={(key) => update({ [key]: 'all', page: '1' })}
        onClearAll={() => update({ status: 'all', balance: 'all', sort: 'newest', page: '1' })}
      />

      <DataTable<Customer>
        data={customers}
        columns={columns}
        keyExtractor={(customer, index) => getId(customer) || `customer-${index}`}
        loading={query.isLoading}
        error={query.isError ? getErrorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        emptyTitle="No customers found"
        emptyMessage="Try adjusting your search or filters, or add a new customer."
        emptyIcon={<Users className="size-6" />}
        emptyActionLabel="New customer"
        onEmptyAction={() => setCreateOpen(true)}
        renderCard={(customer) => (
          <CustomerCard
            customer={customer}
            onOpen={() => navigate(`/customers/${getId(customer)}`)}
          />
        )}
        page={query.data?.meta.page ?? page}
        totalPages={query.data?.meta.totalPages ?? 0}
        total={query.data?.meta.total ?? 0}
        onPageChange={(nextPage) => update({ page: String(nextPage) })}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>New customer</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <CustomerForm
              mode="create"
              areas={areas}
              submitting={createMutation.isPending}
              onSubmit={(values) => handleCreate(values as CreateCustomerInput)}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
