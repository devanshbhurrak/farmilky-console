import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Truck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
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

export function SupplierCard({
  supplier,
  onClick,
}: {
  supplier: Supplier;
  onClick?: (s: Supplier) => void;
}) {
  const due = outstanding(supplier);
  const hasRate = supplier.defaultRatePerLiter !== undefined && supplier.defaultRatePerLiter !== null;

  return (
    <Card
      className="cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50/40 active:bg-slate-50"
      onClick={() => onClick?.(supplier)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(supplier);
        }
      } : undefined}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={supplier.name} className="size-9 shrink-0 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{supplier.name}</p>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-3.5 ${
                supplier.isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className={`size-1.5 rounded-full ${supplier.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {supplier.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {[supplier.phone, supplier.location].filter(Boolean).join(' · ') || 'Contact details not added'}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {hasRate ? (
            <span className="text-slate-500">
              Rate <span className="font-semibold text-slate-700">{formatCurrency(supplier.defaultRatePerLiter)}/L</span>
            </span>
          ) : null}
          <span className={due > 0 ? 'font-semibold text-amber-700' : 'font-medium text-emerald-700'}>
            {due > 0 ? `Due ${formatCurrency(due)}` : 'No outstanding'}
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-medium text-slate-400">View details <span aria-hidden>›</span></span>
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
    status: status !== 'all' ? status : undefined,
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
    if (balanceFilter === 'due') items = items.filter((s) => outstanding(s) > 0);
    if (balanceFilter === 'clear') items = items.filter((s) => outstanding(s) <= 0);
    return items;
  }, [data, balanceFilter]);

  const pageStats = React.useMemo(() => ({
    count: filtered.length,
    active: filtered.filter((s) => s.isActive).length,
    due: filtered.filter((s) => outstanding(s) > 0).length,
    outstanding: filtered.reduce((sum, s) => sum + Math.max(0, outstanding(s)), 0),
  }), [filtered]);

  const columns: Column<Supplier>[] = [
    {
      header: 'Supplier',
      cell: (s) => (
        <button
          onClick={() => navigate(`/suppliers/${getId(s)}`)}
          className="group flex min-w-0 items-center gap-3 text-left"
        >
          <Avatar name={s.name} className="size-9 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900 group-hover:text-primary">
              {s.name}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {s.location || 'Location not added'}
            </span>
          </span>
        </button>
      ),
    },
    {
      header: 'Contact',
      cell: (s) => (
        <span className="whitespace-nowrap text-sm text-slate-600">
          {s.phone || s.email || '—'}
        </span>
      ),
    },
    {
      header: 'Rate / L',
      cell: (s) => (
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {s.defaultRatePerLiter !== undefined && s.defaultRatePerLiter !== null
            ? `${formatCurrency(s.defaultRatePerLiter)}/L`
            : '—'}
        </span>
      ),
    },
    {
      header: 'Outstanding',
      cell: (s) => {
        const due = outstanding(s);
        return due > 0 ? (
          <Badge variant="warning">{formatCurrency(due)}</Badge>
        ) : (
          <Badge variant="success">Clear</Badge>
        );
      },
    },
    {
      header: 'Status',
      cell: (s) => <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${
            s.isActive
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
              : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200'
          }`}
        >
          <span className={`size-1.5 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {s.isActive ? 'Active' : 'Inactive'}
        </span>,
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
    <div className="flex flex-col gap-3">

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-4 items-center divide-x divide-slate-100 px-2 py-2 sm:px-3.5">
          <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center sm:flex-row sm:gap-1.5">
            <span className="truncate text-[9px] font-medium text-slate-500 sm:text-[11px]">Suppliers</span>
            <span className="text-xs font-semibold leading-4 tabular-nums text-slate-900 sm:text-sm">{pageStats.count}</span>
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center sm:flex-row sm:gap-1.5">
            <span className="flex min-w-0 items-center gap-1">
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate text-[9px] font-medium text-slate-500 sm:text-[11px]">Active</span>
            </span>
            <span className="text-xs font-semibold leading-4 tabular-nums text-emerald-700 sm:text-sm">{pageStats.active}</span>
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center sm:flex-row sm:gap-1.5">
            <span className="flex min-w-0 items-center gap-1">
              <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
              <span className="truncate text-[9px] font-medium text-slate-500 sm:text-[11px]">With dues</span>
            </span>
            <span className="text-xs font-semibold leading-4 tabular-nums text-amber-700 sm:text-sm">{pageStats.due}</span>
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center sm:flex-row sm:gap-1.5">
            <span className="truncate text-[9px] font-medium text-slate-500 sm:text-[11px]">Outstanding</span>
            <span className="max-w-full truncate text-xs font-semibold leading-4 tabular-nums text-slate-900 sm:text-sm">{formatCurrency(pageStats.outstanding)}</span>
          </div>
        </div>

        <div className="border-t border-slate-100 px-3 py-2.5 sm:px-3.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_150px_150px_auto] sm:items-center">
            <SearchInput
              value={search}
              onChange={(v) => update({ search: v, page: '1' })}
              placeholder="Search suppliers…"
              className="w-full"
            />

            <div className="grid grid-cols-2 gap-2 sm:contents">
              <Select
                value={status}
                onChange={(e) => update({ status: e.target.value, page: '1' })}
                aria-label="Filter suppliers by status"
                className="w-full min-w-0"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>

              <Select
                value={balanceFilter}
                onChange={(e) => update({ balance: e.target.value, page: '1' })}
                aria-label="Filter suppliers by balance"
                className="w-full min-w-0"
              >
                <option value="all">Any balance</option>
                <option value="due">With dues</option>
                <option value="clear">Settled</option>
              </Select>
            </div>

            <span className="hidden whitespace-nowrap text-right text-[11px] text-slate-500 sm:block">
              {data?.meta.total ?? 0} total results
            </span>
          </div>
        </div>
      </section>


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
                  collectionSessions: (Array.isArray(editing.collectionSessions) ? editing.collectionSessions : ['morning']) as ('morning' | 'evening')[],
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
