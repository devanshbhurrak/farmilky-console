import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FilterBar } from '@/components/data/filter-bar';
import type { ActiveFilter } from '@/components/data/filter-bar';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { FormField } from '@/components/form/form-field';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate, getErrorMessage, getId } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useCreateCustomer, useCustomers } from './hooks';
import { customersApi } from './api';
import { CustomerForm } from './components/customer-form';
import type { AreaOption } from './components/customer-form';
import { CustomerCard, customerBalance } from './components/customer-table';
import type { CreateCustomerInput } from './schemas';
import type { Area } from '@/types/area';
import type { Customer } from '@/types/customer';

function toAreaOptions(items: Area[]): AreaOption[] {
  return items.map((a) => ({ id: getId(a) || a.id, name: a.name }));
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(false);

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? 'all';
  const balanceFilter = params.get('balance') ?? 'all';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 1) || 1;
  const debouncedSearch = useDebounce(search, 400);

  const filters = useFilterDrawer({ status, balance: balanceFilter, sort });

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all' || (k === 'page' && v === '1')) sp.delete(k);
      else sp.set(k, v);
    }
    setParams(sp, { replace: true });
  }

  const { data, isLoading, error, refetch } = useCustomers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMutation = useCreateCustomer();

  const createAction = React.useMemo(
    () => (
      <Button onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-sm">
        <Plus aria-hidden /> Customer
      </Button>
    ),
    [setCreateOpen]
  );
  useRegisterHeaderAction(createAction);

  const { data: areasRes } = useQuery({
    queryKey: queryKeys.areas.list(),
    queryFn: () => customersApi.areasLite(),
  });
  const areas = React.useMemo(() => toAreaOptions(areasRes ?? []), [areasRes]);

  const filtered = React.useMemo(() => {
    let items = [...(data?.items ?? [])];
    if (status === 'active') items = items.filter((c) => c.isActive);
    if (status === 'inactive') items = items.filter((c) => !c.isActive);
    if (balanceFilter === 'due') items = items.filter((c) => customerBalance(c) > 0);
    if (balanceFilter === 'clear') items = items.filter((c) => customerBalance(c) <= 0);
    switch (sort) {
      case 'oldest':
        items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'highest-due':
        items.sort((a, b) => customerBalance(b) - customerBalance(a));
        break;
      default:
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return items;
  }, [data, status, balanceFilter, sort]);

  const activeFilters: ActiveFilter[] = [];
  if (status !== 'all') activeFilters.push({ key: 'status', label: 'Status', value: status });
  if (balanceFilter !== 'all') activeFilters.push({ key: 'balance', label: 'Balance', value: balanceFilter });
  if (sort !== 'newest') activeFilters.push({ key: 'sort', label: 'Sort', value: sort });

  const columns: Column<Customer>[] = [
    {
      header: 'Customer',
      cell: (c) => (
        <button onClick={() => navigate(`/customers/${getId(c)}`)} className="flex items-center gap-3 text-left">
          <Avatar name={c.name} />
          <span>
            <span className="block font-medium text-slate-900 hover:underline">{c.name}</span>
            <span className="block text-xs text-slate-500">{c.phone ?? '—'}</span>
          </span>
        </button>
      ),
    },
    {
      header: 'Area',
      cell: (c) => c.deliveryConfig?.assignedAreaName ?? c.areaName ?? '—',
    },
    {
      header: 'Balance',
      cell: (c) => {
        const b = customerBalance(c);
        return (
          <Badge variant={b > 0 ? 'warning' : 'success'}>
            {b > 0 ? `Due ${formatCurrency(b)}` : 'Clear'}
          </Badge>
        );
      },
    },
    {
      header: 'Since',
      cell: (c) => <span className="whitespace-nowrap">{formatDate(c.createdAt)}</span>,
    },
    {
      header: 'Status',
      cell: (c) => <StatusBadge status={c.isActive ? 'active' : 'inactive'} />,
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
        values.deliveryConfig?.assignedArea || values.deliveryConfig?.deliverySequence !== undefined
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
          <SearchInput value={search} onChange={(v) => update({ search: v, page: '1' })} placeholder="Search name, phone, email…" className="flex-1" />
          <FilterButton activeCount={activeFilters.length} onClick={filters.openDrawer} />
        </div>
        <div className="hidden grid-cols-1 gap-3 sm:grid-cols-3 md:grid">
          <Select value={status} onChange={(e) => update({ status: e.target.value, page: '1' })} aria-label="Status filter">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select value={balanceFilter} onChange={(e) => update({ balance: e.target.value, page: '1' })} aria-label="Balance filter">
            <option value="all">Any balance</option>
            <option value="due">Due</option>
            <option value="clear">Clear</option>
          </Select>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort customers">
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
          update({ status: filters.draft.status, balance: filters.draft.balance, sort: filters.draft.sort, page: '1' });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: 'all', balance: 'all', sort: 'newest' })}
      >
        <FormField label="Status">
          <Select value={filters.draft.status} onChange={(e) => filters.setField('status', e.target.value)} aria-label="Status filter">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Balance">
          <Select value={filters.draft.balance} onChange={(e) => filters.setField('balance', e.target.value)} aria-label="Balance filter">
            <option value="all">Any balance</option>
            <option value="due">Due</option>
            <option value="clear">Clear</option>
          </Select>
        </FormField>
        <FormField label="Sort by">
          <Select value={filters.draft.sort} onChange={(e) => filters.setField('sort', e.target.value)} aria-label="Sort customers">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="highest-due">Highest due</option>
          </Select>
        </FormField>
      </FilterDrawer>

      <FilterBar
        filters={activeFilters}
        onRemove={(key) => update({ [key]: key === 'sort' ? 'newest' : 'all', page: '1' })}
        onClearAll={() => update({ status: 'all', balance: 'all', sort: 'newest', page: '1' })}
      />

      <DataTable<Customer>
        data={filtered}
        columns={columns}
        keyExtractor={(c, i) => getId(c) || `customer-${i}`}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => refetch()}
        emptyTitle="No customers found"
        emptyMessage="Try adjusting your search or filters, or add a new customer."
        emptyIcon={<Users className="size-6" />}
        emptyActionLabel="New customer"
        onEmptyAction={() => setCreateOpen(true)}
        renderCard={(c) => (
          <CustomerCard customer={c} onOpen={() => navigate(`/customers/${getId(c)}`)} />
        )}
        page={page}
        totalPages={data?.meta.totalPages ?? 0}
        total={data?.meta.total ?? 0}
        onPageChange={(p) => update({ page: String(p) })}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>New customer</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <CustomerForm mode="create" areas={areas} submitting={createMutation.isPending} onSubmit={(v) => handleCreate(v as CreateCustomerInput)} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

