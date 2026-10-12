import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';

export interface DashboardResult<T> {
  data: T | null;
  error: string | null;
  /** Original error, preserved so callers can rethrow it with type intact. */
  cause?: unknown;
}

async function safeGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<DashboardResult<T>> {
  try {
    const data = await api.get<T>(path, params);
    return { data, error: null };
  } catch (err) {
    console.error('[dashboard]', path, err);
    return { data: null, error: getErrorMessage(err, `Failed to load ${path}`), cause: err };
  }
}

export const dashboardApi = {
  stats: () => safeGet<unknown>('/api/admin/stats'),
  deliveryPerformance: () => safeGet<unknown>('/api/admin/delivery-performance'),
  deliveryStats: () => safeGet<unknown>('/api/admin/delivery-stats'),
  profitStats: () => safeGet<unknown>('/api/admin/profit-stats'),
  todayShift: () => safeGet<unknown>('/api/milk-collections/today-shift'),
  deliveryBoard: (date: string, slot: string) =>
    safeGet<unknown>('/api/subscriptions/admin/delivery-board', { date, slot, limit: 1 }),
  todaySupply: () => safeGet<unknown>('/api/subscriptions/admin/today-supply'),
  openWork: async (): Promise<
    DashboardResult<{ openComplaints: number; pendingReturns: number }>
  > => {
    const [complaints, returns] = await Promise.all([
      safeGet<unknown>('/api/complaints/admin/all', { status: 'open', limit: 1 }),
      safeGet<unknown>('/api/returns/admin/all', { status: 'requested', limit: 1 }),
    ]);
    const countOf = (res: unknown): number => {
      if (!res || typeof res !== 'object') return 0;
      const root = res as Record<string, unknown>;
      const meta = root.meta as Record<string, unknown> | undefined;
      if (meta && typeof meta.total === 'number') return meta.total;
      const payload = (root.data ?? root) as Record<string, unknown> | unknown[];
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const pagination = (payload as Record<string, unknown>).pagination as Record<string, unknown> | undefined;
        if (pagination && typeof pagination.total === 'number') return pagination.total;
      }
      return 0;
    };
    const error = complaints.error ?? returns.error;
    const cause = complaints.cause ?? returns.cause;
    return {
      data: {
        openComplaints: countOf(complaints.data),
        pendingReturns: countOf(returns.data),
      },
      error,
      ...(cause !== undefined ? { cause } : {}),
    };
  },
};
