import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { cn, getErrorMessage, todayLocal, toLocalDateStr } from '@/lib/utils';
import type { DeliveryBoardEntry, DeliverySessionState } from '@/types/delivery';
import { deliveriesApi } from './api';
import { useDeliveryBoard } from './hooks';
import { DeliveryCard } from './components/delivery-card';
import { DeliveryDetailsDrawer } from './components/delivery-details-drawer';
import { UnconfirmedReview } from './components/unconfirmed-review';
import { DeliveryFilters } from './components/delivery-filters';

export default function DeliveriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const datePickerRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(searchParams.get('date') || todayLocal());
  const [slot, setSlot] = useState(searchParams.get('slot') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [drawerEntries, setDrawerEntries] = useState<DeliveryBoardEntry[] | null>(null);
  const [unconfirmedOpen, setUnconfirmedOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const sessionQuery = useQuery({
    queryKey: queryKeys.deliveries.sessionState(date),
    queryFn: async () => {
      const res = await deliveriesApi.sessionState({ date });
      return (res as unknown as { data: DeliverySessionState }).data ?? (res as DeliverySessionState);
    },
    enabled: !!date,
    staleTime: 60_000,
  });

  const eveningOpen = sessionQuery.data?.eveningOpen ?? true;
  const isToday = sessionQuery.data?.isToday ?? date === todayLocal();
  const eveningLocked = isToday && !eveningOpen;

  const boardQuery = useDeliveryBoard({
    date,
    slot: slot === 'all' ? undefined : slot,
  });

  const entries = useMemo(() => boardQuery.data?.entries ?? [], [boardQuery.data]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // 1. Before 5:00 PM: Hide evening deliveries (evening is locked)
      if (eveningLocked && e.deliverySlot === 'evening') return false;

      // 2. After 5:00 PM: If morning deliveries for this customer were already confirmed (delivered/skipped),
      // only show evening deliveries (unless the user has explicitly selected the 'morning' slot filter or confirmed status filter).
      if (!eveningLocked && slot === 'all' && isToday) {
        const customerMorningEntries = entries.filter(
          (other) => (other.userId || other.customerName) === (e.userId || e.customerName) && other.deliverySlot === 'morning'
        );
        const morningAllConfirmed =
          customerMorningEntries.length > 0 &&
          customerMorningEntries.every(
            (m) => (m.deliveryStatus ?? '').toLowerCase() === 'delivered' || (m.deliveryStatus ?? '').toLowerCase() === 'skipped'
          );

        // If morning is already confirmed and completed, do not show morning delivery in the pending list
        if (morningAllConfirmed && e.deliverySlot === 'morning' && !statusFilter) {
          return false;
        }
      }

      if (statusFilter && e.deliveryStatus !== statusFilter) return false;
      if (slot !== 'all' && e.deliverySlot !== slot) return false;
      if (debouncedSearch) {
        const needle = debouncedSearch.trim().toLowerCase();
        const haystack = [e.customerName, e.productName, e.areaName, e.phone, e.address]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [entries, statusFilter, slot, debouncedSearch, eveningLocked, isToday]);

  const groups = useMemo<{ key: string; customerName: string; phone: string | null; address: string | null; entries: DeliveryBoardEntry[] }[]>(() => {
    const map = new Map<string, { key: string; customerName: string; phone: string | null; address: string | null; entries: DeliveryBoardEntry[] }>();
    for (const e of filteredEntries) {
      const key = e.userId || e.customerName || 'unknown';
      const existing = map.get(key);
      if (existing) {
        existing.entries.push(e);
      } else {
        map.set(key, {
          key,
          customerName: e.customerName || 'Unknown customer',
          phone: e.phone ?? null,
          address: e.address ?? null,
          entries: [e],
        });
      }
    }
    return [...map.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [filteredEntries]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const sp = new URLSearchParams(searchParams);
    sp.set('date', newDate);
    sp.delete('slot');
    setSearchParams(sp, { replace: true });
    setDrawerEntries(null);
  };

  const handlePrevDate = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    handleDateChange(toLocalDateStr(d));
  };

  const handleNextDate = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    handleDateChange(toLocalDateStr(d));
  };

  const handleToday = () => {
    const t = todayLocal();
    handleDateChange(t);
  };

  const handleSlotChange = (next: string) => {
    setSlot(next);
    const sp = new URLSearchParams(searchParams);
    sp.set('slot', next);
    setSearchParams(sp, { replace: true });
  };

  const handleStatusChange = (next: string) => {
    setStatusFilter(next);
    const sp = new URLSearchParams(searchParams);
    if (next) sp.set('status', next); else sp.delete('status');
    setSearchParams(sp, { replace: true });
  };

  const handleSearchChange = (v: string) => {
    setSearch(v);
    const sp = new URLSearchParams(searchParams);
    if (v) sp.set('search', v); else sp.delete('search');
    setSearchParams(sp, { replace: true });
  };

  const openCard = (entry: DeliveryBoardEntry) => {
    setDrawerEntries([entry]);
  };

  if (boardQuery.isLoading || sessionQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-3">
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <div className="p-3">
        <ErrorState message={getErrorMessage(boardQuery.error)} onRetry={() => boardQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 lg:p-6 max-w-[620px] mx-auto">
      {/* ── Date header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={handlePrevDate}
          aria-label="Previous date"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>

        <button
          onClick={() => {
            setDatePickerOpen(true);
            datePickerRef.current?.showPicker?.();
          }}
          aria-label="Selected date"
          className={cn(
            'flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 transition-colors',
            'bg-slate-50 text-slate-900 hover:bg-slate-100',
          )}
        >
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
            {new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
          {isToday && <span className="text-[10px] font-medium text-emerald-600">Today</span>}
        </button>

        <button
          type="button"
          onClick={handleNextDate}
          aria-label="Next date"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>

      {/* ── Evening gate cue ─────────────────────────────────────── */}
      {eveningLocked && (
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs bg-amber-50 border border-amber-100 rounded-lg">
          <span className="text-amber-600" aria-hidden="true">!</span>
          <span className="text-amber-700">Evening deliveries start at 5:00 PM</span>
        </div>
      )}

      {/* ── Filters + search ─────────────────────────────────────── */}
      <DeliveryFilters
        filters={{ date, slot, status: statusFilter, search }}
        onChange={(next) => {
          if (next.date !== date) {
            setDate(next.date);
            handleDateChange(next.date);
          }
          if (next.slot !== slot) handleSlotChange(next.slot);
          if (next.status !== statusFilter) handleStatusChange(next.status);
          if (next.search !== search) handleSearchChange(next.search);
        }}
      />

      <Separator />

      {/* ── Unconfirmed review entry ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Deliveries for {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUnconfirmedOpen(true)}
          className="h-8 px-2 text-xs"
        >
          <RefreshCw className="mr-1 size-3.5" aria-hidden="true" />
          Review unconfirmed
        </Button>
      </div>

      {/* ── Delivery list ────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <EmptyState
          title="No deliveries"
          message={date === todayLocal() ? 'No deliveries scheduled for today.' : `No deliveries on ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`}
          actionLabel={date !== todayLocal() ? 'Today' : undefined}
          onAction={handleToday}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {groups.map((g) => (
            <DeliveryCard
              key={g.key}
              group={g}
              onCardPress={(_entry, customerEntries) => setDrawerEntries(customerEntries)}
              eveningLocked={eveningLocked}
            />
          ))}
        </div>
      )}

      {/* ── Hidden native date picker ────────────────────────────── */}
      <input
        ref={datePickerRef}
        type="date"
        value={date}
        onChange={(e) => {
          setDatePickerOpen(false);
          handleDateChange(e.target.value);
        }}
        hidden
      />

      {/* ── Delivery details drawer (bottom sheet on mobile) ─────── */}
      <Sheet open={drawerEntries !== null} onOpenChange={(open) => { if (!open) setDrawerEntries(null); }}>
        <SheetContent side="bottom">
          {drawerEntries && drawerEntries.length > 0 && (
            <DeliveryDetailsDrawer entries={drawerEntries} date={date} onClose={() => setDrawerEntries(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Unconfirmed review ───────────────────────────────────── */}
      <Sheet open={unconfirmedOpen} onOpenChange={setUnconfirmedOpen}>
        <SheetContent side="bottom">
          <UnconfirmedReview onClose={() => setUnconfirmedOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
