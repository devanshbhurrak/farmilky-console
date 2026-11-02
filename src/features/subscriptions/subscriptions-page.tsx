import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckSquare, Pause, Play, Plus, SlidersHorizontal, Square, X } from 'lucide-react';
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
  daily: 'Daily',
  alternate: 'Alt. Days',
  weekly: 'Weekly',
  custom: 'Custom',
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

  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());

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
    const arr = [];
    if (status) arr.push({ key: 'status', header: 'Status', value: titleCase(status) });
    if (schedule) arr.push({ key: 'schedule', header: 'Schedule', value: titleCase(schedule) });
    if (search) arr.push({ key: 'search', header: 'Search', value: search });
    return arr;
  }, [status, schedule, search]);

  const toggleSelect = (id: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCurrentPage = () => {
    const allIds = items.map((i) => getId(i)).filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const allPageSelected = items.length > 0 && items.every((i) => selectedSet.has(getId(i)));

  const createAction = useMemo(
    () => (
      <Button
        variant="default"
        size="sm"
        onClick={() => setCreateOpen(true)}
        className="px-3.5 py-2 text-xs font-semibold min-h-[38px] shadow-sm flex items-center gap-1.5"
      >
        <Plus className="size-4" aria-hidden /> Add Subscription
      </Button>
    ),
    [setCreateOpen],
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
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selectedSet.has(getId(r) ?? '')} onChange={() => toggleSelect(getId(r) ?? '')} />
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (s: Subscription) => (
        <div
          className="cursor-pointer hover:underline"
          onClick={() => navigate('/subscriptions/' + getId(s))}
        >
          <strong className="block text-slate-900 font-semibold">{getName(s.userId, s.customerName ?? 'Unknown')}</strong>
          <span className="cell-sub text-xs text-slate-500">{s.customerPhone ?? s.customerEmail ?? '—'}</span>
        </div>
      ),
    },
    {
      header: 'Product',
      cell: (s: Subscription) => (
        <div
          className="cursor-pointer"
          onClick={() => navigate('/subscriptions/' + getId(s))}
        >
          <strong className="block text-slate-900 font-medium">{getName(s.productId, s.productName ?? 'Unknown')}</strong>
          <span className="cell-sub text-xs text-slate-500">
            {s.quantityPerDelivery ?? s.quantityPerDay ?? 0} {typeof s.productId === 'object' ? s.productId.unit : ''} / {SCHEDULE_LABEL[s.deliverySchedule] ?? s.deliverySchedule}
          </span>
        </div>
      ),
    },
    {
      header: 'Started',
      cell: (s: Subscription) => <span className="text-slate-700 text-xs">{formatDate(s.startDate)}</span>,
    },
    {
      header: 'Daily Value',
      cell: (s) => {
        const qty = s.quantityPerDelivery ?? s.quantityPerDay ?? 0;
        const rate = s.pricePerPacket ?? s.pricePerUnit ?? 0;
        const daily = s.totalPricePerDelivery ?? s.totalPricePerDay ?? qty * rate;
        const isCustom = s.pricePerPacket != null && s.productId && typeof s.productId === 'object' && s.pricePerPacket !== s.productId.price;
        return (
          <div className="stack-cell">
            <strong className="block font-semibold text-slate-900">{formatCurrency(daily)}</strong>
            {isCustom && (
              <span className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded w-max">
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
        <strong className={s.pendingAmount && s.pendingAmount > 0 ? 'text-red-600 font-semibold' : 'text-slate-600 font-medium'}>
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

  return (
    <div className="view-stack subscriptions-page flex flex-col gap-3 p-3 sm:p-4">
      <PageHeader
        title="Subscriptions"
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="flex sm:hidden w-full min-h-[42px] justify-center text-sm font-semibold shadow-sm"
          >
            <Plus className="size-4 mr-1" /> Add Subscription
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={(v) => updateParam('search', v)}
            placeholder="Search customer, phone, or product…"
            aria-label="Search subscriptions"
            className="flex-1 min-h-[40px]"
          />
          <div className="hidden sm:flex items-center gap-2">
            <Select
              value={status === '' ? 'all' : status}
              onChange={(e) => {
                const v = e.target.value;
                updateParam('status', v === 'all' ? '' : v);
              }}
              className="min-w-[130px] h-10 text-xs"
              aria-label="Status filter"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select
              value={schedule === '' ? 'all' : schedule}
              onChange={(e) => {
                const v = e.target.value;
                updateParam('schedule', v === 'all' ? '' : v);
              }}
              className="min-w-[130px] h-10 text-xs"
              aria-label="Schedule filter"
            >
              <option value="all">All Schedules</option>
              <option value="daily">Daily</option>
              <option value="alternate">Alternate</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <FilterButton activeCount={activeFilters.length} onClick={filters.openDrawer} />
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center pt-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Filtered by:</span>
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200/80 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                <span className="font-bold text-slate-900">{f.header}:</span> {f.value}
                <button
                  onClick={() => updateParam(f.key, '')}
                  className="size-3.5 inline-flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                  aria-label={`Remove ${f.header} filter`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="text-xs text-primary-700 font-semibold underline underline-offset-2 hover:text-primary-800 ml-1 py-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Bulk Action Toolbar */}
        {selectedSet.size > 0 && (
          <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50/90 p-2.5 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllCurrentPage}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-900 hover:text-primary-950"
              >
                {allPageSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                <span>{selectedSet.size} selected</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
                onClick={() => setBulkConfirm('pause')}
                disabled={bulkPending}
              >
                <Pause className="size-3 mr-1" /> Bulk Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
                onClick={() => setBulkConfirm('resume')}
                disabled={bulkPending}
              >
                <Play className="size-3 mr-1" /> Bulk Resume
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-600 hover:text-slate-900"
                onClick={() => setSelectedSet(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Data List / Table */}
        <DataTable<Subscription>
          data={items}
          columns={columns}
          keyExtractor={(s, i) => getId(s) || String(i)}
          loading={listQuery.isLoading}
          error={listQuery.isError ? getErrorMessage(queryError as unknown as Error) : null}
          onRetry={() => listQuery.refetch()}
          emptyTitle="No subscriptions available"
          emptyMessage={hasFilters ? 'No subscriptions match your active filters.' : 'Get started by creating your first subscription.'}
          emptyIcon={<Pause className="size-6 text-slate-400" />}
          emptyActionLabel={hasFilters ? 'Clear filters' : 'Add Subscription'}
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
          <Select
            aria-label="Status filter"
            value={filters.draft.status}
            onChange={(e) => filters.setField('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>
        <FormField label="Schedule">
          <Select
            aria-label="Schedule filter"
            value={filters.draft.schedule}
            onChange={(e) => filters.setField('schedule', e.target.value)}
          >
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
        onOpenChange={(open) => {
          if (!open) setBulkConfirm(null);
        }}
        title={bulkConfirm === 'pause' ? 'Pause Subscriptions' : 'Resume Subscriptions'}
        description={`Are you sure you want to ${bulkConfirm === 'pause' ? 'pause' : 'resume'} ${selectedSet.size} selected subscription${selectedSet.size === 1 ? '' : 's'}?`}
        confirmLabel={bulkConfirm === 'pause' ? 'Pause' : 'Resume'}
        onConfirm={() => {
          bulkAction(bulkConfirm!);
        }}
        loading={bulkPending}
        danger={bulkConfirm === 'pause'}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="sm:max-w-xl">
          <SheetHeader className="p-4 sm:p-5">
            <SheetTitle className="text-base sm:text-lg">Add New Subscription</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
            <SubscriptionForm onSubmit={handleCreate} submitting={createMutation.isPending} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
