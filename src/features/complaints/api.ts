import { api } from '@/lib/api-client';
import type { Complaint } from '@/types/complaint';
import { normalizeList, unwrapData } from '@/lib/utils';

export interface ComplaintListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
}

export interface CreateComplaintInput {
  subject: string;
  description?: string;
  category?: string;
  relatedTo?: string;
  relatedId?: string;
  userId?: string;
}

export const complaintsApi = {
  list: async (params: ComplaintListParams): Promise<{ items: Complaint[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await api.get<unknown>('/api/complaints/admin/all', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      category: params.category,
    });
    const { items, meta } = normalizeList<Complaint>(res, ['complaints']);
    return { items, meta };
  },
  create: async (data: CreateComplaintInput): Promise<Complaint> => {
    const res = await api.post<unknown>('/api/complaints', data);
    return unwrapData<Complaint>(res as { success?: boolean; data?: Complaint });
  },
  updateStatus: async (id: string, data: { status: string; resolution?: string }): Promise<Complaint> => {
    const res = await api.put<unknown>(`/api/complaints/admin/${id}/status`, data);
    return unwrapData<Complaint>(res as { success?: boolean; data?: Complaint });
  },
};
