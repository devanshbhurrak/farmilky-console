import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { cn, getErrorMessage, getId, getName, normalizeList, todayLocal } from '@/lib/utils';
import type { DeliveryBoardEntry } from '@/types/delivery';
import { deliveriesApi } from './api';
import { useDeliveryBoard, useDeliveryBoardSSE } from './hooks';
import { CustomerGroup, entryKeyOf } from './components/customer-group';
import type { CustomerGroupData } from './components/customer-group';
import { DeliveryFilters } from './components/delivery-filters';
import type { AreaOption } from './components/delivery-filters';
import { OutcomeSheet, resolveTarget } from './components/outcome-sheet';
import { BulkActionsBar } from './components/bulk-actions-bar';
import { CustomerConfirmDrawer } from './components/customer-confirm-drawer';
import { ExtraProductsSection } from './components/extra-products-section';

export default function DeliveriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeEntry, setActiveEntry] = useState<DeliveryBoardEntry | null>(null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [confirmGroupKey, setConfirmGroupKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [extraGroup, setExtraGroup] = useState<CustomerGroupData | null>(null);

  const date = searchParams.get('date') || todayLocal();
  const slot = searchParams.get('slot') || 'morning';
  const type = searchParams.get('type') || 'all';
  const status = searchParams.get('status') || '';
  const area = searchParams.get('area') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'sequence';

  const debouncedSearch = useDebounce(search, 400);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useDeliveryBoardSSE(true);

  const areasQuery = useQuery({
    queryKey: queryKeys.areas.list(),
    queryFn: async (): Promise<AreaOption[]> => {
      const res = await deliveriesApi.areasLite();
      return normalizeList<{ id: string; name: string }>(res, ['areas']).items.map((a) => ({
        id: getId(a),
        name: getName(a),
      }));
    },
    placeholderData: keepPreviousData,
  });

  const boardQuery = useDeliveryBoard({
    date,
    slot: slot === 'all' ? undefined : slot,
    page: 1,
    limit: 100,
    type: type === 'all' ? undefined : type,
    status: status || undefined,
    area: area || undefined,
    search: debouncedSearch || undefined,
    sort: sort || undefined,
  });

  const entries = useMemo(() => boardQuery.data?.entries ?? [], [boardQuery.data]);
  const summary = boardQuery.data?.summary;

  const groups = useMemo<CustomerGroupData[]>(() => {
    const sorted = [...entries];
    if (sort === 'name') {
      sorted.sort((a, b) => (a.customerName ?? '').localeCompare(b.customerName ?? ''));
    } else {
      sorted.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    }
    const map = new Map<string, CustomerGroupData>();
    for (const e of sorted) {
      const key = e.userId || e.customerName || 'unknown';
      const existing = map.get(key);
      if (existing) {
        existing.entries.push(e);
      } else {
        map.set(key, {
          key,
          customerName: e.customerName || 'Unknown customer',
          phone: e.phone,
          address: e.address,
          areaName: e.areaName,
          lat: e.lat,
          lng: e.lng,
          customerId: e.userId,
          entries: [e],
        });
      }
    }
    return [...map.values()];
  }, [entries, sort]);

  const keyToEntry = useMemo(() => {
    const m = new Map<string, DeliveryBoardEntry>();
    for (const e of entries) m.set(entryKeyOf(e), e);
    return m;
  }, [entries]);

  const confirmGroup = groups.find((g) => g.key === confirmGroupKey) ?? null;

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)));
  };

  const deliverEntries = async (targets: DeliveryBoardEntry[]) => {
    let done = 0;
    for (const entry of targets) {
      const target = resolveTarget(entry);
      try {
        if (target.kind === 'order') {
          await deliveriesApi.recordOrderOutcome(target.id, { status: 'delivered' });
        } else {
          await deliveriesApi.recordSubscriptionOutcome(target.id, { status: 'delivered' });
        }
        done += 1;
      } catch (err) {
        toast.error(getErrorMessage(err));
        break;
      }
    }
    queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.manifests.all() });
    return done;
  };

  const handleBulkDeliver = async () => {
    const targets = selectedIds
      .map((k) => keyToEntry.get(k))
      .filter((e): e is DeliveryBoardEntry => Boolean(e));
    if (targets.length === 0) return;
    setBulkLoading(true);
    try {
      const done = await deliverEntries(targets);
      toast.success(`Delivered ${done} of ${targets.length}`);
      setSelectedIds([]);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleConfirmGroup = async () => {
    if (!confirmGroup) return;
    const pending = confirmGroup.entries.filter(
      (e) => (e.deliveryStatus ?? '').toLowerCase() === 'pending',
    );
    if (pending.length === 0) {
      setConfirmGroupKey(null);
      return;
    }
    setConfirming(true);
    try {
      const done = await deliverEntries(pending);
      toast.success(`Delivered ${done} of ${pending.length} for ${confirmGroup.customerName}`);
      setConfirmGroupKey(null);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Delivery board" />

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: summary.total, icon: ClipboardList, colorClass: 'bg-slate-100 text-slate-600' },
            { label: 'Remaining', value: summary.remainingDeliveries, icon: Clock, colorClass: 'bg-amber-100 text-amber-700' },
            { label: 'Delivered', value: summary.delivered, icon: CheckCircle2, colorClass: 'bg-emerald-100 text-emerald-700' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-card">
              <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', s.colorClass)}>
                <s.icon className="size-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] text-slate-500">{s.label}</p>
                <p className="text-sm font-semibold tabular-nums text-slate-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeliveryFilters
        filters={{ date, slot, type, status, area, search, sort }}
        onChange={(next) => {
          const sp = new URLSearchParams(searchParams);
          const apply = (k: string, v: string, fallback: string) => {
            if (v && v !== fallback) sp.set(k, v);
            else sp.delete(k);
          };
          apply('date', next.date, '');
          apply('slot', next.slot, 'morning');
          apply('type', next.type, 'all');
          apply('status', next.status, '');
          apply('area', next.area, '');
          apply('search', next.search, '');
          apply('sort', next.sort, 'sequence');
          setSearchParams(sp, { replace: true });
        }}
        areas={areasQuery.data ?? []}
      />

      {boardQuery.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : boardQuery.isError ? (
        <ErrorState message={getErrorMessage(boardQuery.error)} onRetry={() => boardQuery.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No deliveries"
          message="No deliveries scheduled for this date and slot."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <CustomerGroup
              key={g.key}
              customerName={g.customerName}
              phone={g.phone}
              address={g.address}
              areaName={g.areaName}
              entries={g.entries}
              onOutcome={(entry) => {
                setActiveEntry(entry);
                setOutcomeOpen(true);
              }}
              onConfirmAll={() => setConfirmGroupKey(g.key)}
              onAddExtra={() => setExtraGroup(g)}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              confirming={confirming && confirmGroupKey === g.key}
            />
          ))}
        </div>
      )}

      <BulkActionsBar
        count={selectedIds.length}
        onDeliverAll={handleBulkDeliver}
        onClear={() => setSelectedIds([])}
        loading={bulkLoading}
      />

      <OutcomeSheet
        entry={activeEntry}
        date={date}
        open={outcomeOpen}
        onOpenChange={(open) => {
          setOutcomeOpen(open);
          if (!open) setActiveEntry(null);
        }}
      />

      <CustomerConfirmDrawer
        group={
          confirmGroup
            ? {
                customerName: confirmGroup.customerName,
                pendingCount: confirmGroup.entries.filter(
                  (e) => (e.deliveryStatus ?? '').toLowerCase() === 'pending',
                ).length,
              }
            : null
        }
        open={confirmGroupKey !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmGroupKey(null);
        }}
        onConfirm={handleConfirmGroup}
        confirming={confirming}
      />

      <Sheet open={extraGroup !== null} onOpenChange={(open) => { if (!open) setExtraGroup(null); }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Add extra products</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {extraGroup && (
              <ExtraProductsSection customerId={extraGroup.customerId} customerName={extraGroup.customerName} />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
