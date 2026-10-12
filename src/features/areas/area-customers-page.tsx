import * as React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/data/search-input';
import { ErrorState } from '@/components/data/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { getId, normalizeList } from '@/lib/utils';
import type { AreaCustomer } from '@/types/area';
import type { Customer } from '@/types/customer';
import { areasApi } from './api';
import { useArea, useAreaCustomers, useUpdateAreaCustomers } from './hooks';
import { AreaCustomerList } from './components/area-customer-list';

function customerToRow(c: Customer, sequence: number): AreaCustomer {
  const primary = c.addresses?.[0];
  const addressText =
    primary?.street ?? primary?.line1 ?? [primary?.city, primary?.pincode].filter(Boolean).join(', ');
  return {
    customerId: getId(c),
    name: c.name,
    phone: c.phone ?? null,
    address: addressText || null,
    lat: primary?.lat ?? null,
    lng: primary?.lng ?? null,
    sequence,
  };
}

export default function AreaCustomersPage() {
  const { id = '' } = useParams();
  const { data: area, isLoading: areaLoading, isError: areaError, refetch: refetchArea } = useArea(id);
  const {
    data: serverRows,
    isLoading: rowsLoading,
    isError: rowsError,
    refetch: refetchRows,
  } = useAreaCustomers(id);
  const updateMutation = useUpdateAreaCustomers();

  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const debouncedSearch = useDebounce(rawSearch, 400);

  const searchQuery = useQuery({
    queryKey: ['areas', id, 'customer-search', debouncedSearch],
    queryFn: async () =>
      normalizeList<Customer>(
        await areasApi.searchCustomers({
          search: debouncedSearch.trim() || undefined,
          limit: 20,
        }),
      ),
    placeholderData: keepPreviousData,
  });

  const [assigned, setAssigned] = React.useState<AreaCustomer[]>([]);
  const [baseline, setBaseline] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    if (serverRows && baseline === null) {
      setAssigned(serverRows);
      setBaseline(serverRows.map((c) => c.customerId));
    }
  }, [serverRows, baseline]);

  const currentIds = assigned.map((c) => c.customerId);
  const dirty = baseline !== null && JSON.stringify(currentIds) !== JSON.stringify(baseline);

  const assignedIds = new Set(currentIds);
  const available = (searchQuery.data?.items ?? []).filter((c) => !assignedIds.has(getId(c)));

  const move = (index: number, direction: -1 | 1) => {
    setAssigned((prev) => {
      const next = [...prev];
      const j = index + direction;
      if (j < 0 || j >= next.length) return prev;
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(j, 0, moved);
      return next.map((c, i) => ({ ...c, sequence: i + 1 }));
    });
  };

  const removeAt = (index: number) => {
    setAssigned((prev) =>
      prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, sequence: i + 1 })),
    );
  };

  const addCustomer = (c: Customer) => {
    setAssigned((prev) => [...prev, customerToRow(c, prev.length + 1)]);
  };

  const discard = () => {
    setAssigned(serverRows ?? []);
    setBaseline((serverRows ?? []).map((c) => c.customerId));
  };

  const save = () => {
    updateMutation.mutate(
      { areaId: id, customerIds: currentIds },
      { onSuccess: () => setBaseline(currentIds) },
    );
  };

  const loading = areaLoading || rowsLoading;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title={area ? `${area.name} — Customers` : 'Area customers'}
        description="Set the delivery sequence. Customers are visited top to bottom."
        breadcrumbs={[{ label: 'Areas', path: '/areas' }, { label: area?.name ?? 'Customers' }]}
      />

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : areaError || rowsError ? (
        <ErrorState
          message="Failed to load area customers"
          onRetry={() => {
            refetchArea();
            refetchRows();
          }}
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm text-slate-600">
              <span>
                <strong className="text-slate-900">{assigned.length}</strong> assigned
              </span>
              {area?.assignedAgentName ? (
                <Badge variant="secondary">Agent: {area.assignedAgentName}</Badge>
              ) : null}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-slate-900">Assigned (delivery order)</h2>
            <AreaCustomerList customers={assigned} onMove={move} onRemove={removeAt} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-slate-900">Add customers</h2>
            <SearchInput
              value={rawSearch}
              onChange={(v) => {
                const next = new URLSearchParams(searchParams);
                if (v) next.set('search', v);
                else next.delete('search');
                setSearchParams(next);
              }}
              placeholder="Search customers by name or phone…"
              className="sm:max-w-xs"
            />
            {searchQuery.isLoading ? (
              <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : available.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No available customers found for this search.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {available.map((c) => (
                  <li
                    key={getId(c)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                      {c.phone ? <p className="text-xs text-slate-500">{c.phone}</p> : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addCustomer(c)}
                      aria-label={`Add ${c.name}`}
                    >
                      <Plus />
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {assigned.length} customers · unsaved order changes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={discard} disabled={updateMutation.isPending}>
                Discard
              </Button>
              <Button onClick={save} loading={updateMutation.isPending}>
                Save order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
