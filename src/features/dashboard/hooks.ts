import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';
import { queryKeys } from '@/lib/query-keys';
import { normalizeList, unwrapData } from '@/lib/utils';
import type { TodayShiftSummary } from '@/types/supplier';
import type { SupplyRow } from './types';

const STALE = 60_000;

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

export function useProfitStats() {
  return useQuery({
    queryKey: queryKeys.admin.profitStats(),
    queryFn: async () => unwrapOrThrow(await dashboardApi.profitStats()),
    staleTime: STALE,
  });
}

export function useTodayShift() {
  return useQuery<TodayShiftSummary | null>({
    queryKey: queryKeys.milkCollections.todayShift(),
    queryFn: async () => {
      const res = unwrapOrThrow(await dashboardApi.todayShift());
      if (!res) return null;
      return unwrapData<TodayShiftSummary>(res as { success?: boolean; data?: TodayShiftSummary });
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

/**
 * Product id → display name. Today-supply items only carry `productId`, so the
 * load sheet needs the catalog to render readable product rows.
 */
export function useProductCatalog() {
  return useQuery({
    queryKey: [...queryKeys.products.all(), 'catalog'],
    queryFn: async () => {
      const res = unwrapOrThrow(await dashboardApi.products());
      const { items } = normalizeList<{ id?: string; _id?: string; name?: string }>(res, ['products']);
      const names: Record<string, string> = {};
      for (const p of items) {
        const id = p.id ?? p._id;
        if (id) names[id] = p.name ?? id;
      }
      return names;
    },
    staleTime: STALE,
  });
}

interface SupplyGroup {
  userIds: Set<string>;
  liters: number;
  qty: number;
  amount: number;
  label?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Today's load sheet: today-supply returns one raw row per active
 * subscription, so group by product and compute the customers / liters /
 * deliveries / amount the table columns expect.
 */
export function useLoadSheet() {
  const supply = useTodaySupply();
  const catalog = useProductCatalog();

  const rows = useMemo<SupplyRow[]>(() => {
    const items = (supply.data?.rows ?? []) as Record<string, unknown>[];
    const grouped = new Map<string, SupplyGroup>();
    for (const sub of items) {
      const productId = sub.productId != null ? String(sub.productId) : '';
      const label = sub.variantLabel != null && String(sub.variantLabel) !== '' ? String(sub.variantLabel) : undefined;
      const key = productId || label || 'unknown';
      const entry: SupplyGroup =
        grouped.get(key) ?? { userIds: new Set<string>(), liters: 0, qty: 0, amount: 0, label };
      if (sub.userId != null) entry.userIds.add(String(sub.userId));
      entry.liters = round2(entry.liters + (Number(sub.quantityPerDelivery) || 0));
      entry.qty += 1;
      entry.amount = round2(entry.amount + (Number(sub.totalPricePerDelivery) || 0));
      grouped.set(key, entry);
    }
    const names = catalog.data ?? {};
    return [...grouped.entries()].map(([key, g]) => ({
      product: names[key] ?? g.label ?? 'Unknown product',
      customers: g.userIds.size,
      liters: g.liters,
      qty: g.qty,
      amount: g.amount,
    }));
  }, [supply.data, catalog.data]);

  return {
    rows,
    isLoading: supply.isLoading || catalog.isLoading,
    isError: supply.isError || catalog.isError,
  };
}
