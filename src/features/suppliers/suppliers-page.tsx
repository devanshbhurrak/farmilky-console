import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2, Truck } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { formatCurrency, getErrorMessage, getId } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useCreateSupplier, useDeleteSupplier, useSuppliers, useUpdateSupplier } from './hooks';
import { SupplierForm } from './components/supplier-form';
import type { SupplierInput } from './schemas';
import type { Supplier } from '@/types/supplier';

function outstanding(s: Supplier): number {
  return Number(s.outstandingAmount ?? 0);
}

export function SupplierCard({ supplier, onClick }: { supplier: Supplier; onClick?: (s: Supplier) => void }) {
  const due = outstanding(supplier);
  return (
    <Card
      className="cursor-pointer p-4"
      onClick={() => onClick?.(supplier)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(supplier); } : undefined}
    >
      <div className="flex items-start gap-3">
        <Avatar name={supplier.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{supplier.name}</p>
            <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {supplier.location ?? '—'}
            {supplier.defaultRatePerLiter !== undefined ? ` · ₹${supplier.defaultRatePerLiter}/L` : ''}
          </p>
          <div className="mt-2">
            <Badge variant={due > 0 ? 'warning' : 'success'}>
              {due > 0 ? `Due ${formatCurrency(due)}` : 'Clear'}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);
  const [deleting, setDeleting] = React.useState<Supplier | null>(null);

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? 'all';
  const balanceFilter = params.get('balance') ?? 'all';
  const page = Number(params.get('page') ?? 1) || 1;
  const debouncedSearch = useDebounce(search, 400);

  const filters = useFilterDrawer({ status, balance: balanceFilter });

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all' || (k === 'page' && v === '1')) sp.delete(k);
      else sp.set(k, v);
    }
    setParams(sp, { replace: true });
  }

  const { data, isLoading, error, refetch } = useSuppliers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMutation = useCreateSupplier();

  const createAction = React.useMemo(
    () => (
      <Button onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-sm">
        <Plus aria-hidden /> Supplier
      </Button>
    ),
    [setCreateOpen]
  );
  useRegisterHeaderAction(createAction);
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const filtered = React.useMemo(() => {
    let items = [...(data?.items ?? [])];
    if (status === 'active') items = items.filter((s) => s.isActive);
    if (status === 'inactive') items = items.filter((s) => !s.isActive);
    if (balanceFilter === 'due') items = items.filter((s) => outstanding(s) > 0);
    if (balanceFilter === 'clear') items = items.filter((s) => outstanding(s) <= 0);
    return items;
  }, [data, status, balanceFilter]);

  const activeFilters: ActiveFilter[] = [];
  if (status !== 'all') activeFilters.push({ key: 'status', label: 'Status', value: status });
  if (balanceFilter !== 'all') activeFilters.push({ key: 'balance', label: 'Balance', value: balanceFilter });

  const columns: Column<Supplier>[] = [
    {
      header: 'Farmer',
      cell: (s) => (
        <button onClick={() => navigate(`/suppliers/${getId(s)}`)} className="flex items-center gap-3 text-left">
          <Avatar name={s.name} />
          <span>
            <span className="block font-medium text-slate-900 hover:underline">{s.name}</span>
            <span className="block text-xs text-slate-500">{s.phone ?? '—'}</span>
          </span>
        </button>
      ),
    },
    {
      header: 'Location',
      cell: (s) => <span className="whitespace-nowrap">{s.location ?? '—'}</span>,
    },
    {
      header: 'Rate / L',
      cell: (s) => (s.defaultRatePerLiter !== undefined ? formatCurrency(s.defaultRatePerLiter) : '—'),
    },
    {
      header: 'Outstanding',
      cell: (s) => {
        const due = outstanding(s);
        return <Badge variant={due > 0 ? 'warning' : 'success'}>{due > 0 ? formatCurrency(due) : 'Clear'}</Badge>;
      },
    },
    {
      header: 'Status',
      cell: (s) => <StatusBadge status={s.isActive ? 'active' : 'inactive'} />,
    },
    {
      header: 'Actions',
      cell: (s) => (
        <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
            <Pencil aria-hidden />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}>
            <Trash2 aria-hidden />
          </Button>
        </span>
      ),
    },
  ];

  async function handleSave(values: SupplierInput, id?: string) {
    const payload = {
      ...values,
      email: values.email || undefined,
      collectionSessions: values.collectionSessions ?? ['morning', 'evening'],
    };
    if (id) {
      await updateMutation.mutateAsync({ id, data: payload });
      setEditing(null);
    } else {
      await createMutation.mutateAsync(payload);
      setCreateOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Suppliers" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SearchInput value={search} onChange={(v) => update({ search: v, page: '1' })} placeholder="Search suppliers…" className="flex-1" />
          <FilterButton activeCount={activeFilters.length} onClick={filters.openDrawer} />
        </div>
        <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 md:grid">
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
        </div>
      </div>

      <FilterDrawer
        open={filters.open}
        onOpenChange={filters.setOpen}
        activeCount={activeFilters.length}
        onApply={() => {
          update({ status: filters.draft.status, balance: filters.draft.balance, page: '1' });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: 'all', balance: 'all' })}
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
      </FilterDrawer>

      <FilterBar
        filters={activeFilters}
        onRemove={(key) => update({ [key]: 'all', page: '1' })}
        onClearAll={() => update({ status: 'all', balance: 'all', page: '1' })}
      />

      <DataTable<Supplier>
        data={filtered}
        columns={columns}
        keyExtractor={(s, i) => getId(s) || `supplier-${i}`}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => refetch()}
        emptyTitle="No suppliers found"
        emptyMessage="Try adjusting your filters, or add a new supplier."
        emptyIcon={<Truck className="size-6" />}
        emptyActionLabel="New supplier"
        onEmptyAction={() => setCreateOpen(true)}
        renderCard={(s) => <SupplierCard supplier={s} onClick={(sup) => navigate(`/suppliers/${getId(sup)}`)} />}
        page={page}
        totalPages={data?.meta.totalPages ?? 0}
        total={data?.meta.total ?? 0}
        onPageChange={(p) => update({ page: String(p) })}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>New supplier</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <SupplierForm submitting={createMutation.isPending} onSubmit={(v) => handleSave(v)} />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit supplier</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {editing && (
              <SupplierForm
                submitting={updateMutation.isPending}
                defaultValues={{
                  name: editing.name,
                  phone: editing.phone ?? '',
                  email: editing.email ?? '',
                  location: editing.location ?? '',
                  pincode: editing.pincode ?? '',
                  joiningDate: editing.joiningDate?.slice(0, 10) ?? '',
                  collectionSessions: (editing.collectionSessions as ('morning' | 'evening')[]) ?? ['morning', 'evening'],
                  defaultMorningQty: editing.defaultMorningQty,
                  defaultEveningQty: editing.defaultEveningQty,
                  defaultRatePerLiter: editing.defaultRatePerLiter,
                  isActive: editing.isActive,
                  bankDetails: {
                    holderName: editing.bankDetails?.holderName ?? '',
                    accountNo: editing.bankDetails?.accountNo ?? '',
                    ifscCode: editing.bankDetails?.ifscCode ?? '',
                    bankName: editing.bankDetails?.bankName ?? '',
                  },
                  notes: editing.notes ?? '',
                }}
                onSubmit={(v) => handleSave(v, getId(editing))}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(null); }}
        title="Delete supplier?"
        description={`${deleting?.name ?? ''} will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(getId(deleting), { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
