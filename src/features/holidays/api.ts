import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/types/common';
import type { Holiday } from '@/types/holiday';
import type { HolidayInput } from './schemas';

export const holidaysApi = {
  list: (year?: number) =>
    api.get<ApiResponse<Holiday[]> | ApiResponse<{ holidays: Holiday[] }>>(
      '/api/holidays',
      year ? { year } : undefined,
    ),
  create: (data: HolidayInput) => api.post<ApiResponse<Holiday>>('/api/holidays', data),
  update: (id: string, data: { isActive: boolean }) =>
    api.put<ApiResponse<Holiday>>(`/api/holidays/${id}`, data),
  remove: (id: string) => api.delete<ApiResponse<unknown>>(`/api/holidays/${id}`),
};
