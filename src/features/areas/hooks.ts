import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { areasApi } from './api';
import type { AreaInput } from './schemas';
import type { Area, AreaCustomer } from '@/types/area';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, getId, getName, getPhone, normalizeList, unwrapData } from '@/lib/utils';

export interface AgentOption {
  id: string;
  name: string;
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isNaN(n) ? fallback : n;
}

/** Tolerate both `AreaCustomer` rows and nested `{ customer }` payloads. */
function toAreaCustomer(item: unknown, index: number): AreaCustomer {
  if (!item || typeof item !== 'object') {
    return { customerId: '', name: 'Unknown', sequence: index + 1 };
  }
  const o = item as Record<string, unknown>;
  const nested = (o.customer ?? o.user ?? null) as unknown;
  const source = (nested && typeof nested === 'object' ? nested : item) as Record<string, unknown>;
  const rawId = o.customerId ?? o.customer_id ?? getId(source);
  const address = source.address ?? o.address;
  const addressText =
    typeof address === 'string'
      ? address
      : address && typeof address === 'object'
        ? String(
            (address as Record<string, unknown>).street ??
              (address as Record<string, unknown>).line1 ??
              '',
          )
        : null;
  const latRaw =
    source.lat ?? (address && typeof address === 'object'
      ? (address as Record<string, unknown>).lat
      : undefined);
  const lngRaw =
    source.lng ?? (address && typeof address === 'object'
      ? (address as Record<string, unknown>).lng
      : undefined);
  const lat = typeof latRaw === 'number' || typeof latRaw === 'string' ? Number(latRaw) : null;
  const lng = typeof lngRaw === 'number' || typeof lngRaw === 'string' ? Number(lngRaw) : null;
  return {
    customerId: typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : getId(item),
    name:
      (typeof o.name === 'string' && o.name) ||
      getName(source, 'Unknown'),
    phone:
      (typeof o.phone === 'string' && o.phone) ||
      getPhone(source) ||
      null,
    address: addressText || null,
    lat: lat !== null && !Number.isNaN(lat) ? lat : null,
    lng: lng !== null && !Number.isNaN(lng) ? lng : null,
    sequence: toNumber(o.sequence ?? o.deliverySequence, index + 1),
  };
}

export function useAreas() {
  return useQuery({
    queryKey: queryKeys.areas.list(),
    queryFn: async () => normalizeList<Area>(await areasApi.list()),
  });
}

export function useArea(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.areas.all(), 'detail', id ?? ''],
    queryFn: async () => unwrapData<Area>(await areasApi.get(id ?? '')),
    enabled: Boolean(id),
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AreaInput) => areasApi.create(data),
    onSuccess: () => {
      toast.success('Area created');
      void queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AreaInput }) => areasApi.update(id, data),
    onSuccess: () => {
      toast.success('Area updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => areasApi.remove(id),
    onSuccess: () => {
      toast.success('Area deleted');
      void queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useAgentsWithAreas() {
  return useQuery({
    queryKey: queryKeys.agents.list({ scope: 'areas' }),
    queryFn: async (): Promise<AgentOption[]> => {
      const { items } = normalizeList<unknown>(await areasApi.agents());
      return items
        .map((a) => ({ id: getId(a), name: getName(a, 'Unnamed agent') }))
        .filter((a) => a.id !== '');
    },
  });
}

export function useAreaCustomers(areaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.areas.customers(areaId ?? ''),
    queryFn: async (): Promise<AreaCustomer[]> => {
      const res = await areasApi.areaCustomers(areaId ?? '');
      const { items } = normalizeList<unknown>(res);
      return items.map((item, i) => toAreaCustomer(item, i));
    },
    enabled: Boolean(areaId),
  });
}

export function useUpdateAreaCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ areaId, customerIds }: { areaId: string; customerIds: string[] }) =>
      areasApi.updateCustomers(areaId, customerIds),
    onSuccess: (_data, vars) => {
      toast.success('Delivery order updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.areas.customers(vars.areaId) });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
