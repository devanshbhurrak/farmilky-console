import { api } from '@/lib/api-client';
import type {
  ConfirmResult,
  GenerateSummary,
  MissingCollection,
  MilkCollection,
  Supplier,
  TodayShiftSummary,
  UpdateResult,
} from '@/types/supplier';
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
  actualQty?: number;
  ratePerLiter?: number;
  fatContent?: number | null;
  snf?: number | null;
  notes?: string | null;
}

export interface BulkConfirmInput {
  date: string;
  ratePerLiter?: number;
  session: 'morning' | 'evening' | 'both';
}

export const milkApi = {
  daily: async (date: string): Promise<MilkCollection[]> => {
    const res = await api.get<unknown>('/api/milk-collections/daily', { date });
    const { items } = normalizeList<MilkCollection>(res, ['collections']);
    return items;
  },
  generate: async (date: string): Promise<GenerateSummary> => {
    const res = await api.post<unknown>('/api/milk-collections/generate', { date });
    return unwrapData<GenerateSummary>(res as { success?: boolean; data?: GenerateSummary });
  },
  missing: async (from: string, to: string): Promise<MissingCollection[]> => {
    try {
      const res = await api.get<unknown>('/api/milk-collections/missing', { startDate: from, endDate: to });
      const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
      if (Array.isArray(unwrapped)) return unwrapped as MissingCollection[];
      if (unwrapped && typeof unwrapped === 'object') {
        const obj = unwrapped as Record<string, unknown>;
        for (const key of ['missing', 'dates', 'days', 'data', 'items']) {
          if (Array.isArray(obj[key])) return obj[key] as MissingCollection[];
        }
      }
      return [];
    } catch {
      return [];
    }
  },
  confirm: async (id: string, data: ConfirmCollectionInput): Promise<ConfirmResult> => {
    const res = await api.post<unknown>(`/api/milk-collections/${id}/confirm`, data);
    return unwrapData<ConfirmResult>(res as { success?: boolean; data?: ConfirmResult });
  },
  update: async (id: string, data: UpdateCollectionInput): Promise<UpdateResult> => {
    const res = await api.put<unknown>(`/api/milk-collections/${id}`, data);
    return unwrapData<UpdateResult>(res as { success?: boolean; data?: UpdateResult });
  },
  bulkConfirm: async (input: BulkConfirmInput): Promise<{ confirmed: number; skipped: number; date: string }> => {
    const res = await api.post<unknown>('/api/milk-collections/bulk-confirm', input);
    return unwrapData<{ confirmed: number; skipped: number; date: string }>(
      res as { success?: boolean; data?: { confirmed: number; skipped: number; date: string } },
    );
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
  todayShift: async (): Promise<TodayShiftSummary> => {
    const res = await api.get<unknown>('/api/milk-collections/today-shift');
    return unwrapData<TodayShiftSummary>(res as { success?: boolean; data?: TodayShiftSummary });
  },
};
