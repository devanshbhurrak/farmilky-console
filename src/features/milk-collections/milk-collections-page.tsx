import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { useConfirmCollection, useCollectionHistory, useDailyCollections, useGenerateDaily, useUpdateCollection } from './hooks';
import { milkApi } from './api';
import { CollectionForm } from './components/collection-form';
import { ShiftSummary } from './components/shift-summary';
import { queryKeys } from '@/lib/query-keys';
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  formatNumber,
  getErrorMessage,
  getId,
  getName,
  todayLocal,
} from '@/lib/utils';
import type { MilkCollection } from '@/types/supplier';

function isConfirmed(c: MilkCollection): boolean {
  if (c.isConfirmed === true) return true;
  return String(c.status ?? '').toLowerCase() === 'confirmed';
}

function farmerName(c: MilkCollection): string {
  if (c.supplierName) return c.supplierName;
  return getName(c.supplierId, 'Unknown farmer');
}

function PendingRow({
  collection,
  onConfirm,
  confirming,
}: {
  collection: MilkCollection;
  onConfirm: (id: string, values: { actualQty: number; ratePerLiter: number; fatContent?: number; snf?: number; notes?: string }) => void;
  confirming: boolean;
}) {
  const [qty, setQty] = React.useState<string>(String(collection.actualQty ?? collection.expectedQty ?? ''));
  const [rate, setRate] = React.useState<string>(String(collection.ratePerLiter ?? ''));
  const [fat, setFat] = React.useState<string>(collection.fatContent != null ? String(collection.fatContent) : '');
  const [snf, setSnf] = React.useState<string>(collection.snf != null ? String(collection.snf) : '');

  const submit = (noSupply: boolean) => {
    onConfirm(getId(collection), {
      actualQty: noSupply ? 0 : Number(qty) || 0,
      ratePerLiter: Number(rate) || 0,
      fatContent: fat === '' ? undefined : Number(fat),
      snf: snf === '' ? undefined : Number(snf),
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-900">{farmerName(collection)}</p>
            <p className="text-xs text-slate-500 capitalize">
              {String(collection.session)} · Expected {formatNumber(collection.expectedQty ?? 0)} L
            </p>
          </div>
          <StatusBadge status="pending" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} step="0.1" aria-label="Actual quantity" placeholder="Qty (L)" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input type="number" min={0} step="0.5" aria-label="Rate per liter" placeholder="Rate ₹/L" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Input type="number" min={0} max={100} step="0.1" aria-label="Fat percent" placeholder="Fat %" value={fat} onChange={(e) => setFat(e.target.value)} />
          <Input type="number" min={0} max={100} step="0.1" aria-label="SNF" placeholder="SNF" value={snf} onChange={(e) => setSnf(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="min-h-11 flex-1" loading={confirming} onClick={() => submit(false)}>
            Confirm
          </Button>
          <Button size="sm" variant="outline" className="min-h-11 flex-1" disabled={confirming} onClick={() => submit(true)}>
            No Supply (0L)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MilkCollectionsPage() {
  const [params, setParams] = useSearchParams();
  const today = todayLocal();
  const tab = params.get('tab') ?? 'daily';
  const date = params.get('date') ?? today;
  const session = params.get('session') ?? 'morning';
  const search = params.get('search') ?? '';
  const hSupplier = params.get('hSupplier') ?? '';
  const hFrom = params.get('hFrom') ?? '';
  const hTo = params.get('hTo') ?? '';
  const hSession = params.get('hSession') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const debouncedSearch = useDebounce(search, 400);

  const dailyQuery = useDailyCollections(date);
  const generate = useGenerateDaily();
  const confirmMutation = useConfirmCollection();
  const updateMutation = useUpdateCollection();

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers.list({ limit: 100 }),
    queryFn: () => milkApi.suppliersLite(),
  });

  const missingFrom = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 4);
    return d.toISOString().slice(0, 10);
  }, []);
  const missingQuery = useQuery({
    queryKey: ['milk-collections', 'missing', missingFrom, today],
    queryFn: () => milkApi.missing(missingFrom, today),
    staleTime: 60_000,
  });

  const historyQuery = useCollectionHistory({
    supplierId: hSupplier || undefined,
    from: hFrom || undefined,
    to: hTo || undefined,
    session: hSession || undefined,
    page,
    limit: 20,
  });

  const [editing, setEditing] = React.useState<MilkCollection | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string>('');

  const daily = dailyQuery.data ?? [];
  const isPast = date < today;

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return daily.filter((c) => {
      if (session === 'morning' || session === 'evening') {
        if (String(c.session).toLowerCase() !== session) return false;
      }
      if (q && !farmerName(c).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [daily, session, debouncedSearch]);

  const pending = filtered.filter((c) => !isConfirmed(c));
  const confirmed = filtered.filter((c) => isConfirmed(c));
  const confirmedCount = daily.filter(isConfirmed).length;

  const handleConfirm = (id: string, values: { actualQty: number; ratePerLiter: number; fatContent?: number; snf?: number; notes?: string }) => {
    setConfirmingId(id);
    confirmMutation.mutate(
      { id, data: values },
      { onSettled: () => setConfirmingId('') },
    );
  };

  const historyColumns: Column<MilkCollection>[] = [
    { header: 'Date', cell: (c) => formatDate(c.date) },
    { header: 'Farmer', cell: (c) => farmerName(c) },
    { header: 'Session', cell: (c) => <span className="capitalize">{String(c.session)}</span> },
    { header: 'Qty (L)', cell: (c) => formatNumber(c.actualQty ?? 0) },
    { header: 'Rate', cell: (c) => formatCurrency(c.ratePerLiter ?? 0) },
    { header: 'Amount', cell: (c) => formatCurrency(c.amount ?? 0) },
    { header: 'Status', cell: (c) => <StatusBadge status={isConfirmed(c) ? 'confirmed' : 'pending'} /> },
  ];

  const historyItems = historyQuery.data?.items ?? [];
  const historyMeta = historyQuery.data?.meta;
  const historyLiters = historyItems.reduce((s, c) => s + (Number(c.actualQty ?? 0) || 0), 0);
  const historyAmount = historyItems.reduce((s, c) => s + (Number(c.amount ?? 0) || 0), 0);

  const exportHistoryCsv = () => {
    try {
      downloadCsv(
        `milk-collections-${hFrom || 'all'}-${hTo || 'all'}.csv`,
        historyItems.map((c) => [
          String(c.date ?? '').slice(0, 10),
          farmerName(c),
          String(c.session ?? ''),
          Number(c.actualQty ?? 0),
          c.fatContent ?? '',
          c.snf ?? '',
          Number(c.ratePerLiter ?? 0),
          Number(c.amount ?? 0),
          isConfirmed(c) ? 'Confirmed' : 'Pending',
        ]),
        ['Date', 'Farmer', 'Session', 'Qty', 'Fat', 'SNF', 'Rate', 'Amount', 'Payment'],
      );
      toast.success('CSV exported');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Milk Collections"
        description="Record and review daily farmer milk collections"
        actions={
          tab === 'daily' ? (
            <Button
              className="min-h-11"
              loading={generate.isPending}
              onClick={() => generate.mutate(date)}
            >
              Generate day
            </Button>
          ) : (
            <Button variant="outline" className="min-h-11" onClick={exportHistoryCsv}>
              Export CSV
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v })}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="flex flex-col gap-4">
          {isPast && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You are viewing a past date ({formatDate(date)}). Changes will backdate records.
            </div>
          )}
          {(missingQuery.data ?? []).length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Missing collections on: {(missingQuery.data ?? []).join(', ')}
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              type="date"
              aria-label="Collection date"
              value={date}
              max={today}
              onChange={(e) => set({ date: e.target.value })}
              className="md:max-w-55"
            />
            <SearchInput value={search} onChange={(v) => set({ search: v })} placeholder="Search farmer…" className="md:max-w-70" />
          </div>

          <Tabs value={session} onValueChange={(v) => set({ session: v })}>
            <TabsList className="md:max-w-80">
              <TabsTrigger value="morning">Morning</TabsTrigger>
              <TabsTrigger value="evening">Evening</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card>
            <CardContent className="flex items-center justify-between gap-2 pt-4">
              <p className="text-sm text-slate-600">
                Confirmed {confirmedCount}/{daily.length}
              </p>
              <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${daily.length > 0 ? Math.round((confirmedCount / daily.length) * 100) : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <ShiftSummary collections={filtered} />

          {dailyQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading collections…</p>
          ) : dailyQuery.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">{getErrorMessage(dailyQuery.error)}</p>
              <Button variant="outline" className="w-fit" onClick={() => dailyQuery.refetch()}>Retry</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pending.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">Pending ({pending.length})</h2>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {pending.map((c) => (
                      <PendingRow
                        key={getId(c)}
                        collection={c}
                        confirming={confirmMutation.isPending && confirmingId === getId(c)}
                        onConfirm={handleConfirm}
                      />
                    ))}
                  </div>
                </section>
              )}
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Confirmed ({confirmed.length})</h2>
                <DataTable
                  data={confirmed}
                  keyExtractor={(c) => getId(c)}
                  loading={false}
                  emptyTitle="No confirmed collections"
                  emptyMessage="Confirm pending rows above to see them here."
                  columns={[
                    { header: 'Farmer', cell: (c) => farmerName(c) },
                    { header: 'Qty (L)', cell: (c) => formatNumber(c.actualQty ?? 0) },
                    { header: 'Fat', cell: (c) => (c.fatContent ?? '—').toString() },
                    { header: 'SNF', cell: (c) => (c.snf ?? '—').toString() },
                    { header: 'Rate', cell: (c) => formatCurrency(c.ratePerLiter ?? 0) },
                    { header: 'Amount', cell: (c) => formatCurrency(c.amount ?? 0) },
                    {
                      header: 'Action',
                      cell: (c) => (
                        <Button size="sm" variant="outline" className="min-h-11" onClick={() => setEditing(c)}>
                          Edit
                        </Button>
                      ),
                    },
                  ]}
                  renderCard={(c) => (
                    <Card>
                      <CardContent className="flex items-center justify-between gap-2 pt-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{farmerName(c)}</p>
                          <p className="text-xs text-slate-500">
                            {formatNumber(c.actualQty ?? 0)} L · {formatCurrency(c.amount ?? 0)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="min-h-11" onClick={() => setEditing(c)}>
                          Edit
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                />
              </section>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Select aria-label="Supplier" value={hSupplier} onChange={(e) => set({ hSupplier: e.target.value, page: '' })}>
              <option value="">All suppliers</option>
              {(suppliersQuery.data ?? []).map((s) => (
                <option key={getId(s)} value={getId(s)}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input type="date" aria-label="From date" value={hFrom} onChange={(e) => set({ hFrom: e.target.value, page: '' })} />
            <Input type="date" aria-label="To date" value={hTo} onChange={(e) => set({ hTo: e.target.value, page: '' })} />
            <Select aria-label="Session" value={hSession} onChange={(e) => set({ hSession: e.target.value, page: '' })}>
              <option value="">All sessions</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </Select>
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 pt-4 text-sm text-slate-600">
              <span>{historyMeta?.total ?? 0} records</span>
              <span>{formatNumber(historyLiters)} L total</span>
              <span>{formatCurrency(historyAmount)} total</span>
            </CardContent>
          </Card>

          <DataTable
            data={historyItems}
            columns={historyColumns}
            keyExtractor={(c) => getId(c)}
            loading={historyQuery.isLoading}
            error={historyQuery.isError ? getErrorMessage(historyQuery.error) : null}
            onRetry={() => historyQuery.refetch()}
            emptyTitle="No collection history"
            emptyMessage="Try adjusting your filters."
            page={historyMeta?.page ?? page}
            totalPages={historyMeta?.totalPages ?? 1}
            total={historyMeta?.total ?? 0}
            onPageChange={(p) => set({ page: String(p) })}
            renderCard={(c) => (
              <Card>
                <CardContent className="flex flex-col gap-1 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{farmerName(c)}</p>
                    <StatusBadge status={isConfirmed(c) ? 'confirmed' : 'pending'} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDate(c.date)} · <span className="capitalize">{String(c.session)}</span> · {formatNumber(c.actualQty ?? 0)} L · {formatCurrency(c.amount ?? 0)}
                  </p>
                </CardContent>
              </Card>
            )}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit collection</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {editing && (
              <CollectionForm
                defaultValues={{
                  actualQty: editing.actualQty ?? 0,
                  ratePerLiter: editing.ratePerLiter ?? 0,
                  fatContent: editing.fatContent,
                  snf: editing.snf,
                  notes: editing.notes,
                }}
                submitting={updateMutation.isPending}
                onSubmit={(values) => {
                  updateMutation.mutate(
                    { id: getId(editing), data: values },
                    { onSuccess: () => setEditing(null) },
                  );
                }}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
