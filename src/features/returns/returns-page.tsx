import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { FormField } from '@/components/form/form-field';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { useReturns, useUpdateReturnStatus } from './hooks';
import { ReturnActionForm } from './components/return-action-form';
import { formatCurrency, formatDate, getErrorMessage, getId, getName, shortId } from '@/lib/utils';
import type { ReturnRequest } from '@/types/return';

function orderLabel(orderId: ReturnRequest['orderId']): string {
  if (!orderId) return '—';
  if (typeof orderId === 'string') return shortId(orderId);
  return shortId(orderId.id);
}

export default function ReturnsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;

  const filters = useFilterDrawer({ status });

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const debouncedSearch = useDebounce(search, 400);
  const query = useReturns({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });
  const updateMutation = useUpdateReturnStatus();
  const [acting, setActing] = React.useState<ReturnRequest | null>(null);

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const columns: Column<ReturnRequest>[] = [
    {
      header: 'Customer',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{getName(r.userId, r.customerName ?? '—')}</p>
          <p className="text-xs text-slate-500">Order {orderLabel(r.orderId)}</p>
        </div>
      ),
    },
    { header: 'Reason', cell: (r) => <span className="block max-w-60 truncate">{r.reason}</span> },
    { header: 'Refund', cell: (r) => formatCurrency(r.refundAmount ?? 0) },
    { header: 'Status', cell: (r) => <StatusBadge status={String(r.status)} /> },
    { header: 'Date', cell: (r) => formatDate(r.createdAt) },
    {
      header: 'Action',
      cell: (r) => (
        <Button size="sm" variant="outline" className="min-h-11" onClick={() => setActing(r)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Returns" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SearchInput value={search} onChange={(v) => set({ search: v, page: '' })} placeholder="Search returns…" className="flex-1 md:max-w-70" />
          <FilterButton activeCount={status ? 1 : 0} onClick={filters.openDrawer} />
        </div>
        <div className="hidden md:block">
          <Select aria-label="Status filter" value={status} onChange={(e) => set({ status: e.target.value, page: '' })} className="md:max-w-55">
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
      </div>

      <FilterDrawer
        open={filters.open}
        onOpenChange={filters.setOpen}
        activeCount={status ? 1 : 0}
        onApply={() => {
          set({ status: filters.draft.status, page: '' });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: '' })}
      >
        <FormField label="Status">
          <Select aria-label="Status filter" value={filters.draft.status} onChange={(e) => filters.setField('status', e.target.value)}>
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </Select>
        </FormField>
      </FilterDrawer>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(r) => getId(r)}
        loading={query.isLoading}
        error={query.isError ? getErrorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        emptyTitle="No returns"
        emptyMessage="No return requests match your filters."
        page={meta?.page ?? page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        onPageChange={(p) => set({ page: String(p) })}
        renderCard={(r) => (
          <Card>
            <CardContent className="flex flex-col gap-2 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{getName(r.userId, r.customerName ?? '—')}</p>
                <StatusBadge status={String(r.status)} />
              </div>
              <p className="text-xs text-slate-500">Order {orderLabel(r.orderId)} · {formatDate(r.createdAt)}</p>
              <p className="text-sm text-slate-700">{r.reason}</p>
              <p className="text-sm font-medium text-slate-900">Refund: {formatCurrency(r.refundAmount ?? 0)}</p>
              <Button size="sm" variant="outline" className="min-h-11 w-full" onClick={() => setActing(r)}>
                Review
              </Button>
            </CardContent>
          </Card>
        )}
      />

      <Sheet open={acting !== null} onOpenChange={(open) => { if (!open) setActing(null); }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Process return</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            {acting && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{getName(acting.userId, acting.customerName ?? '—')}</p>
                <p>Order {orderLabel(acting.orderId)}</p>
                <p className="mt-1">{acting.reason}</p>
              </div>
            )}
            {acting && (
              <ReturnActionForm
                defaultStatus={String(acting.status)}
                defaultRefund={acting.refundAmount}
                submitting={updateMutation.isPending}
                onSubmit={(values) =>
                  updateMutation.mutate(
                    {
                      id: getId(acting),
                      data: {
                        status: values.status,
                        refundAmount: values.refundAmount,
                        adminNotes: values.adminNotes || undefined,
                      },
                    },
                    { onSuccess: () => setActing(null) },
                  )
                }
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
