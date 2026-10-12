import { api } from '@/lib/api-client';
import type { ReturnRequest } from '@/types/return';
import { normalizeList, unwrapData } from '@/lib/utils';

export interface ReturnListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface UpdateReturnStatusInput {
  status: string;
  refundAmount?: number;
  adminNotes?: string;
}

export const returnsApi = {
  list: async (params: ReturnListParams): Promise<{ items: ReturnRequest[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await api.get<unknown>('/api/returns/admin/all', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
    });
    const { items, meta } = normalizeList<ReturnRequest>(res, ['returns']);
    return { items, meta };
  },
  updateStatus: async (id: string, data: UpdateReturnStatusInput): Promise<ReturnRequest> => {
    const res = await api.put<unknown>(`/api/returns/admin/${id}/status`, data);
    return unwrapData<ReturnRequest>(res as { success?: boolean; data?: ReturnRequest });
  },
};
