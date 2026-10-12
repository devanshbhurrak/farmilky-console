import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/types/common';
import type { Area, AreaCustomer } from '@/types/area';
import type { AreaInput } from './schemas';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface CustomerSearchParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const areasApi = {
  list: () => api.get<ApiResponse<Area[]>>('/api/areas'),
  get: (id: string) => api.get<ApiResponse<Area>>(`/api/areas/${id}`),
  create: (data: AreaInput) => api.post<ApiResponse<Area>>('/api/areas', data),
  update: (id: string, data: AreaInput) =>
    api.put<ApiResponse<Area>>(`/api/areas/${id}`, data),
  remove: (id: string) => api.delete<ApiResponse<unknown>>(`/api/areas/${id}`),
  agents: () => api.get<unknown>('/api/areas/agents'),
  areaCustomers: (areaId: string) =>
    api.get<ApiResponse<AreaCustomer[]> | ApiResponse<{ customers: AreaCustomer[] }>>(
      `/api/areas/${areaId}/customers`,
    ),
  updateCustomers: (areaId: string, customerIds: string[]) =>
    api.put<ApiResponse<AreaCustomer[]>>(`/api/areas/${areaId}/customers`, { customerIds }),
  searchCustomers: (params?: CustomerSearchParams) =>
    api.get<unknown>('/api/users/admin/all', {
      role: 'customer',
      ...(params ?? {}),
    } as QueryParams),
};
