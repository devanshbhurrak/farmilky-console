import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
import { FilterBar } from '@/components/data/filter-bar';
import { StatusBadge } from '@/components/data/status-badge';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, getErrorMessage, getId, getName, getPhone, titleCase } from '@/lib/utils';
import type { Subscription } from '@/types/subscription';
import { useCreateSubscription, useSubscriptions } from './hooks';
import type { SubscriptionInput } from './schemas';
import { SubscriptionForm } from './components/subscription-form';
import { SubscriptionCard } from './components/subscription-table';
import { SubscriptionBulkActions } from './components/subscription-bulk-actions';

const PAGE_LIMIT = 20;

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const schedule = searchParams.get('schedule') ?? '';
  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1);

  const debouncedSearch = useDebounce(search, 400);

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

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta;

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)));
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? items.map((s) => getId(s)) : []);
  };

  const allSelected = useMemo(
    () => items.length > 0 && items.every((s) => selected.includes(getId(s))),
    [items, selected],
  );

  const activeFilters = useMemo(() => {
    const out: { key: string; label: string; value: string }[] = [];
    if (status) out.push({ key: 'status', label: 'Status', value: titleCase(status) });
    if (schedule) out.push({ key: 'schedule', label: 'Schedule', value: titleCase(schedule) });
    if (debouncedSearch) out.push({ key: 'search', label: 'Search', value: debouncedSearch });
    return out;
  }, [status, schedule, debouncedSearch]);

  const columns: Column<Subscription>[] = [
    {
      header: '',
      cell: (s) => (
        <Checkbox
          checked={selected.includes(getId(s))}
          onChange={(e) => toggleSelect(getId(s), e.target.checked)}
          aria-label="Select subscription"
        />
      ),
    },
    {
      header: 'Customer',
      cell: (s) => (
        <div>
          <div className="font-medium text-slate-900">{getName(s.userId, s.customerName ?? '—')}</div>
          <div className="text-xs text-slate-500">{getPhone(s.userId) || '—'}</div>
        </div>
      ),
    },
    {
      header: 'Plan',
      cell: (s) => (
        <div>
          <div className="font-medium text-slate-900">{getName(s.productId, s.productName ?? '—')}</div>
          <div className="text-xs text-slate-500">
            {s.quantityPerDay}/day · {titleCase(s.deliverySchedule)}
          </div>
        </div>
      ),
    },
    {
      header: 'Daily value',
      cell: (s) => formatCurrency(s.totalPricePerDay ?? s.quantityPerDay * s.pricePerUnit),
    },
    {
      header: 'Status',
      cell: (s) => <StatusBadge status={s.status} />,
    },
  ];

  const handleCreate = (values: SubscriptionInput) => {
    createMutation.mutate(values, {
      onSuccess: () => setCreateOpen(false),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Subscriptions"
        description="Manage recurring milk subscriptions"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="min-h-11">
            <Plus /> New subscription
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => updateParam('search', v)}
            placeholder="Search subscriptions…"
            className="sm:max-w-xs"
          />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              aria-label="Status filter"
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="sm:max-w-44"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select
              aria-label="Schedule filter"
              value={schedule}
              onChange={(e) => updateParam('schedule', e.target.value)}
              className="sm:max-w-44"
            >
              <option value="">All schedules</option>
              <option value="daily">Daily</option>
              <option value="alternate">Alternate</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </Select>
            {items.length > 0 && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-600">
                <Checkbox checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
                Select all
              </label>
            )}
          </div>
        </div>
        <FilterBar
          filters={activeFilters}
          onRemove={(key) => updateParam(key, '')}
          onClearAll={() => setSearchParams({}, { replace: true })}
        />
      </div>

      <SubscriptionBulkActions selectedIds={selected} onDone={() => setSelected([])} />

      <DataTable<Subscription>
        data={items}
        columns={columns}
        keyExtractor={(s, i) => getId(s) || String(i)}
        loading={listQuery.isLoading}
        error={listQuery.isError ? getErrorMessage(listQuery.error) : null}
        onRetry={() => listQuery.refetch()}
        emptyTitle="No subscriptions"
        emptyMessage="No subscriptions match your filters."
        emptyActionLabel="New subscription"
        onEmptyAction={() => setCreateOpen(true)}
        renderCard={(s) => (
          <SubscriptionCard
            subscription={s}
            selected={selected.includes(getId(s))}
            onSelect={(checked) => toggleSelect(getId(s), checked)}
            onClick={() => {
              navigate(`/subscriptions/${getId(s)}`);
            }}
          />
        )}
        page={page}
        totalPages={meta?.totalPages ?? 0}
        total={meta?.total ?? 0}
        onPageChange={(p) => updateParam('page', String(p))}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>New subscription</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <SubscriptionForm onSubmit={handleCreate} submitting={createMutation.isPending} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
