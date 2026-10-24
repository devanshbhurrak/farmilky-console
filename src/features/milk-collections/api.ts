import { api } from '@/lib/api-client';
import type { MilkCollection, Supplier } from '@/types/supplier';
import { normalizeList, unwrapData } from '@/lib/utils';

export interface CollectionHistoryParams {
  supplierId?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ConfirmCollectionInput {
  actualQty: number;
  ratePerLiter: number;
  fatContent?: number;
  snf?: number;
  notes?: string;
}

export interface UpdateCollectionInput {
  void_reason?: string;
  actualQty?: number;
  ratePerLiter?: number;
  fatContent?: number | null;
  snf?: number | null;
  notes?: string | null;
}

export const milkApi = {
  daily: async (date: string): Promise<MilkCollection[]> => {
    const res = await api.get<unknown>('/api/milk-collections/daily', { date });
    const { items } = normalizeList<MilkCollection>(res, ['collections']);
    return items;
  },
  generate: async (date: string): Promise<MilkCollection[]> => {
    const res = await api.post<unknown>('/api/milk-collections/generate', { date });
    const { items } = normalizeList<MilkCollection>(res, ['collections']);
    return items;
  },
  missing: async (from: string, to: string): Promise<string[]> => {
    try {
      const res = await api.get<unknown>('/api/milk-collections/missing', { startDate: from, endDate: to });
      const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
      if (Array.isArray(unwrapped)) return unwrapped.map((d) => String(d));
      if (unwrapped && typeof unwrapped === 'object') {
        const obj = unwrapped as Record<string, unknown>;
        for (const key of ['missing', 'dates', 'days', 'data']) {
          if (Array.isArray(obj[key])) return (obj[key] as unknown[]).map((d) => String(d));
        }
      }
      return [];
    } catch {
      return [];
    }
  },
  confirm: async (id: string, data: ConfirmCollectionInput): Promise<MilkCollection> => {
    const res = await api.post<unknown>(`/api/milk-collections/${id}/confirm`, data);
    return unwrapData<MilkCollection>(res as { success?: boolean; data?: MilkCollection });
  },
  update: async (id: string, data: UpdateCollectionInput): Promise<MilkCollection> => {
    const res = await api.put<unknown>(`/api/milk-collections/${id}`, {
      ...data,
      void_reason: data.void_reason || 'Admin edit',
    });
    return unwrapData<MilkCollection>(res as { success?: boolean; data?: MilkCollection });
  },
  history: async (params: CollectionHistoryParams): Promise<{ items: MilkCollection[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await api.get<unknown>('/api/milk-collections', {
      supplierId: params.supplierId,
      startDate: params.from || undefined,
      endDate: params.to || undefined,
      status: params.status || undefined,
      page: params.page,
      limit: params.limit,
    });
    const { items, meta } = normalizeList<MilkCollection>(res, ['collections']);
    return { items, meta };
  },
  suppliersLite: async (): Promise<Supplier[]> => {
    const res = await api.get<unknown>('/api/suppliers', { limit: 100 });
    const { items } = normalizeList<Supplier>(res, ['suppliers']);
    return items;
  },
  todayShift: async (): Promise<MilkCollection[]> => {
    const res = await api.get<unknown>('/api/milk-collections/today-shift');
    const { items } = normalizeList<MilkCollection>(res, ['collections']);
    return items;
  },
};
