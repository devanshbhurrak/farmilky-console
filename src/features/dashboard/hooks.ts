import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';
import { queryKeys } from '@/lib/query-keys';
import { normalizeList, unwrapData } from '@/lib/utils';
import type { MilkCollection } from '@/types/supplier';
import type { SupplyRow } from './types';

const STALE = 60_000;

function rowsOf(res: unknown, keys: string[]): { items: { [k: string]: unknown }[] } {
  if (!res) return { items: [] };
  const { items } = normalizeList<{ [k: string]: unknown }>(res, keys);
  return { items };
}

// Unwrap the { data, error } envelope: a failed fetch becomes a thrown error
// so React Query exposes it via isError/error instead of rendering blank
// cards. Rethrowing the original error keeps ApiError status handling (e.g.
// no retry on 401/403/404) intact.
function unwrapOrThrow<T>(res: { data: T | null; error: string | null; cause?: unknown }): T | null {
  if (res.error) {
    if (res.cause instanceof Error) throw res.cause;
    throw new Error(res.error);
  }
  return res.data;
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: async () => unwrapOrThrow(await dashboardApi.stats()),
    staleTime: STALE,
  });
}

export function useDeliveryPerformance() {
  return useQuery({
    queryKey: queryKeys.admin.deliveryPerformance(),
    queryFn: async () => unwrapOrThrow(await dashboardApi.deliveryPerformance()),
    staleTime: STALE,
  });
}

export function useDeliveryStats() {
  return useQuery({
    queryKey: queryKeys.admin.deliveryStats(),
    queryFn: async () => unwrapOrThrow(await dashboardApi.deliveryStats()),
    staleTime: STALE,
  });
}

export function useProfitStats() {
  return useQuery({
    queryKey: queryKeys.admin.profitStats(),
    queryFn: async () => unwrapOrThrow(await dashboardApi.profitStats()),
    staleTime: STALE,
  });
}

export function useTodayShift() {
  return useQuery({
    queryKey: queryKeys.milkCollections.todayShift(),
    queryFn: async (): Promise<MilkCollection[]> => {
      const res = unwrapOrThrow(await dashboardApi.todayShift());
      if (!res) return [];
      return rowsOf(res, ['collections']).items as unknown as MilkCollection[];
    },
    staleTime: STALE,
  });
}

export function useBoardSummary(date: string) {
  return useQuery({
    queryKey: [...queryKeys.subscriptions.deliveryBoard(date, 'morning'), 'summary'],
    queryFn: async (): Promise<{ remainingDeliveries: number; raw: unknown }> => {
      const res = unwrapOrThrow(await dashboardApi.deliveryBoard(date, 'morning'));
      if (!res) return { remainingDeliveries: 0, raw: null };
      const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
      const obj = (unwrapped && typeof unwrapped === 'object' ? unwrapped : {}) as Record<string, unknown>;
      const summary = (obj.summary ?? {}) as Record<string, unknown>;
      const remaining = Number(summary.remainingDeliveries ?? summary.remaining ?? summary.pending ?? 0) || 0;
      return { remainingDeliveries: remaining, raw: res };
    },
    staleTime: STALE,
  });
}

export function useTodaySupply() {
  return useQuery({
    queryKey: queryKeys.subscriptions.todaySupply(),
    queryFn: async (): Promise<{ rows: SupplyRow[]; raw: unknown }> => {
      const res = unwrapOrThrow(await dashboardApi.todaySupply());
      if (!res) return { rows: [], raw: null };
      const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
      const obj = (unwrapped && typeof unwrapped === 'object' ? unwrapped : {}) as Record<string, unknown>;
      const summary = (obj.summary ?? {}) as Record<string, unknown>;
      const byProduct = summary.byProduct;
      if (Array.isArray(byProduct)) return { rows: byProduct as SupplyRow[], raw: res };
      const { items } = normalizeList<SupplyRow>(res, ['byProduct', 'products', 'supply']);
      return { rows: items, raw: res };
    },
    staleTime: STALE,
  });
}

export function useOpenWork() {
  return useQuery({
    queryKey: ['admin', 'open-work'],
    queryFn: async () => {
      const res = await dashboardApi.openWork();
      if (res.error) {
        if (res.cause instanceof Error) throw res.cause;
        throw new Error(res.error);
      }
      return res.data ?? { openComplaints: 0, pendingReturns: 0 };
    },
    staleTime: STALE,
  });
}
