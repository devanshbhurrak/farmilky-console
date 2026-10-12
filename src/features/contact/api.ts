import { api } from '@/lib/api-client';
import type { ContactMessage } from '@/types/contact';
import { normalizeList, unwrapData } from '@/lib/utils';

export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const contactApi = {
  list: async (params: ContactListParams): Promise<{ items: ContactMessage[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await api.get<unknown>('/api/contact/admin/all', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
    });
    const { items, meta } = normalizeList<ContactMessage>(res, ['messages', 'contacts']);
    return { items, meta };
  },
  updateStatus: async (id: string, status: string): Promise<ContactMessage> => {
    const res = await api.patch<unknown>(`/api/contact/admin/${id}/status`, { status });
    return unwrapData<ContactMessage>(res as { success?: boolean; data?: ContactMessage });
  },
};
