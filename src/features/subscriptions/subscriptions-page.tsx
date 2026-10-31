import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pause, Play, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { FormField } from '@/components/form/form-field';
import { StatusBadge } from '@/components/data/status-badge';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, formatDate, getErrorMessage, getId, getName, titleCase } from '@/lib/utils';
import type { Subscription } from '@/types/subscription';
import { useCreateSubscription, useSubscriptions, useBulkPause, useBulkResume } from './hooks';
import type { SubscriptionInput } from './schemas';
import { SubscriptionForm } from './components/subscription-form';
import { SubscriptionCard } from './components/subscription-table';

const PAGE_LIMIT = 20;

const SCHEDULE_LABEL: Record<string, string> = {
  daily: 'Daily', alternate: 'Alt. days', weekly: 'Weekly', custom: 'Custom',
};

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<'pause' | 'resume' | null>(null);

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const schedule = searchParams.get('schedule') ?? '';
  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1);

  const debouncedSearch = useDebounce(search, 400);
  const filters = useFilterDrawer({ status, schedule });

  const [selectedSet, setSelectedSet] = useState(new Set<string>());

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const listQuery = useSubscriptions({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    status: status || undefined,
    schedule: schedule || undefined,
  });
  const createMutation = useCreateSubscription();
  const bulkPauseMutation = useBulkPause();
  const bulkResumeMutation = useBulkResume();

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta;
  const queryError = listQuery.error;

  const activeFilters = useMemo(() => {
    const filters = [];
    if (status) filters.push({ key: 'status', header: 'Status', value: titleCase(status) });
    if (schedule) filters.push({ key: 'schedule', header: 'Schedule', value: titleCase(schedule) });
    if (search) filters.push({ key: 'search', header: 'Search', value: search });
    return filters;
  }, [status, schedule, search]);

  const toggleSelect = (id: string) => setSelectedSet((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const createAction = useMemo(
    () => (
      <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-sm min-h-[36px]">
        <Plus aria-hidden /> Add Subscription
      </Button>
    ),
    [setCreateOpen]
  );
  useRegisterHeaderAction(createAction);

  const handleCreate = (data: SubscriptionInput) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setCreateOpen(false);
        listQuery.refetch();
      },
    });
  };

  const columns: Column<Subscription>[] = [
    {
      header: 'Select',
      cell: (r: Subscription) => (
        <div className="flex items-center">
          <Checkbox checked={selectedSet.has(getId(r) ?? '')} onChange={() => toggleSelect(getId(r) ?? '')} />
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (s: Subscription) => (
        <>
          <strong className="block">{getName(s.userId, s.customerName ?? 'Unknown')}</strong>
          <span className="cell-sub text-xs text-slate-500">{s.customerPhone ?? s.customerEmail ?? ''}</span>
        </>
      ),
    },
    {
      header: 'Product',
      cell: (s: Subscription) => (
        <>
          <strong className="block">{getName(s.productId, s.productName ?? 'Unknown')}</strong>
          <span className="cell-sub text-xs text-slate-500">
            {s.quantityPerDelivery ?? s.quantityPerDay ?? 0} {typeof s.productId === 'object' ? s.productId.unit : ''} / {SCHEDULE_LABEL[s.deliverySchedule] ?? s.deliverySchedule}
          </span>
        </>
      ),
    },
    { header: 'Started', cell: (s: Subscription) => <span className="text-slate-700">{formatDate(s.startDate)}</span> },
    {
      header: 'Daily Value',
      cell: (s) => {
        const qty = s.quantityPerDelivery ?? s.quantityPerDay ?? 0;
        const rate = s.pricePerPacket ?? s.pricePerUnit ?? 0;
        const daily = s.totalPricePerDelivery ?? s.totalPricePerDay ?? qty * rate;
        const isCustom = s.pricePerPacket != null && s.productId && typeof s.productId === 'object' && s.pricePerPacket !== s.productId.price;
        return (
          <div className="stack-cell">
            <strong className="block">{formatCurrency(daily)}</strong>
            {isCustom && (
              <span className="price-badge text-[10px] font-bold bg-warning-bg border-warning/20 text-warning px-1.5 py-0.5 rounded">
                CUSTOM
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Pending',
      cell: (s: Subscription) => (
        <strong className={s.pendingAmount && s.pendingAmount > 0 ? 'danger-text text-red-600' : 'text-slate-700'}>
          {formatCurrency(s.pendingAmount ?? 0)}
        </strong>
      ),
    },
    {
      header: 'Status',
      cell: (s: Subscription) => <StatusBadge status={s.status} />,
    },
  ];

  const renderSubscriptionCard = (s: Subscription) => (
    <SubscriptionCard subscription={s} onClick={() => navigate('/subscriptions/' + getId(s))} />
  );

  const bulkAction = (action: 'pause' | 'resume') => {
    const ids = Array.from(selectedSet);
    if (ids.length === 0) return;
    const mutate = action === 'pause' ? bulkPauseMutation : bulkResumeMutation;
    mutate.mutate(ids, {
      onSuccess: () => {
        setBulkConfirm(null);
        setSelectedSet(new Set());
      },
    });
  };
  const bulkPending = bulkPauseMutation.isPending || bulkResumeMutation.isPending;

  const hasFilters = status !== '' || schedule !== '' || !!search.trim();
  const clearFilters = () => {
    setSearchParams({}, { replace: true });
    filters.setDraft({ status: '', schedule: '' });
  };

  if (listQuery.isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="h-10 w-1/3 animate-pulse rounded-full bg-slate-200" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }
  if (listQuery.isError) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-red-600">{getErrorMessage(listQuery.error)}</p>
          <Button variant="outline" onClick={() => listQuery.refetch()} className="mt-3 min-h-10">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-stack subscriptions-page flex flex-col gap-3">
      <PageHeader title="Subscriptions" />

      <div className="surface flex flex-col gap-3">
        <div className="surface-filters flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <SearchInput value={search} onChange={(v) => updateParam('search', v)} placeholder="Search customer or product…" aria-label="Search subscriptions" className="flex-1 md:max-w-80" />
          <div className="desktop-filters hidden flex-wrap gap-2 sm:flex">
            <Select value={status === '' ? 'all' : status} onChange={(e) => {
              const v = e.target.value;
              updateParam('status', v === 'all' ? '' : v);
            }} className="min-w-[140px]" aria-label="Status filter">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select value={schedule === '' ? 'all' : schedule} onChange={(e) => {
              const v = e.target.value;
              updateParam('schedule', v === 'all' ? '' : v);
            }} className="min-w-[140px]" aria-label="Schedule filter">
              <option value="all">All Schedules</option>
              <option value="daily">Daily</option>
              <option value="alternate">Alternate</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <FilterButton activeCount={activeFilters.length} onClick={filters.openDrawer} />
        </div>

        {activeFilters.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {activeFilters.map((f) => (
              <span key={f.key} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                <span className="font-semibold text-slate-900">{f.header}:</span> {f.value}
                <button onClick={() => updateParam(f.key, '')} className="ml-1 text-slate-400 hover:text-slate-600">×</button>
              </span>
            ))}
            <button onClick={clearFilters} className="ml-1 text-xs text-slate-500 underline underline-offset-4 hover:text-slate-700">Clear all</button>
          </div>
        )}

        {selectedSet.size > 0 && (
          <div className="bulk-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <span className="bulk-count text-xs font-semibold text-slate-900">{selectedSet.size} selected</span>
            <button className="btn btn-danger btn-sm bg-danger text-white hover:bg-red-600 rounded-lg px-3 py-2 text-xs font-medium transition-colors" onClick={() => setBulkConfirm('pause')} disabled={bulkPending}>
              <Pause className="size-3.5" aria-hidden /> Bulk Pause
            </button>
            <button className="btn btn-secondary btn-sm bg-slate-100 text-slate-900 hover:bg-slate-200 rounded-lg px-3 py-2 text-xs font-medium transition-colors" onClick={() => setBulkConfirm('resume')} disabled={bulkPending}>
              <Play className="size-3.5" aria-hidden /> Bulk Resume
            </button>
            <button className="btn-ghost text-slate-500 hover:text-slate-700 text-xs font-medium hover:bg-slate-100 rounded-lg px-2 py-2" onClick={() => setSelectedSet(new Set())}>
              Clear
            </button>
          </div>
        )}

        <DataTable<Subscription>
          data={items}
          columns={columns}
          keyExtractor={(s, i) => getId(s) || String(i)}
          loading={listQuery.isLoading}
          error={listQuery.isError ? getErrorMessage(queryError as unknown as Error) : null}
          onRetry={() => listQuery.refetch()}
          emptyTitle="No subscriptions available."
          emptyMessage={hasFilters ? 'No subscriptions match your filters.' : 'No subscriptions yet.'}
          emptyIcon={<Pause className="size-6 text-slate-400" />}
          emptyActionLabel={hasFilters ? 'Clear filters' : 'New subscription'}
          onEmptyAction={hasFilters ? clearFilters : () => setCreateOpen(true)}
          renderCard={renderSubscriptionCard}
          page={page}
          totalPages={meta?.totalPages ?? 0}
          total={meta?.total ?? 0}
          onPageChange={(p) => updateParam('page', String(p))}
        />
      </div>

      <FilterDrawer
        open={filters.open}
        onOpenChange={filters.setOpen}
        activeCount={activeFilters.length}
        onApply={() => {
          const next = new URLSearchParams(searchParams);
          const apply = (key: string, value: string) => {
            if (value) next.set(key, value);
            else next.delete(key);
          };
          apply('status', filters.draft.status);
          apply('schedule', filters.draft.schedule);
          next.delete('page');
          setSearchParams(next, { replace: true });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: '', schedule: '' })}
      >
        <FormField label="Status">
          <Select aria-label="Status filter" value={filters.draft.status} onChange={(e) => filters.setField('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>
        <FormField label="Schedule">
          <Select aria-label="Schedule filter" value={filters.draft.schedule} onChange={(e) => filters.setField('schedule', e.target.value)}>
            <option value="">All Schedules</option>
            <option value="daily">Daily</option>
            <option value="alternate">Alternate</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </Select>
        </FormField>
      </FilterDrawer>

      <ConfirmDialog
        open={bulkConfirm !== null}
        onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}
        title={bulkConfirm === 'pause' ? 'Pause Subscriptions' : 'Resume Subscriptions'}
        description={`${bulkConfirm === 'pause' ? 'Pause' : 'Resume'} ${selectedSet.size} selected subscription${selectedSet.size === 1 ? '' : 's'}?`}
        confirmLabel={bulkConfirm === 'pause' ? 'Pause' : 'Resume'}
        onConfirm={() => {
          bulkAction(bulkConfirm!);
        }}
        loading={bulkPending}
        danger={bulkConfirm === 'pause'}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Add Subscription</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <SubscriptionForm onSubmit={handleCreate} submitting={createMutation.isPending} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
