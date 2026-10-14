import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { Manifest, ManifestListParams } from '@/types/manifest';

export interface GenerateManifestRequest {
  date: string;
  slot?: string;
}

export interface ManifestEntryUpdate {
  status: string;
  notes?: string;
  failureReason?: string;
}

export const manifestsApi = {
  list: (params: ManifestListParams = {}) =>
    api.get<PaginatedResponse<Manifest>>('/api/manifests', {
      page: params.page,
      limit: params.limit,
      date: params.date,
      slot: params.slot,
      agentId: params.agentId,
      status: params.status,
    }),
  get: (id: string) => api.get<ApiResponse<Manifest>>(`/api/manifests/${id}`),
  generate: (data: GenerateManifestRequest) => api.post<ApiResponse<unknown>>('/api/manifests/generate', data),
  resequence: (id: string, entryIds: string[]) =>
    api.put<ApiResponse<Manifest>>(`/api/manifests/${id}/resequence`, { orderedEntryIds: entryIds }),
  updateEntry: (manifestId: string, entryId: string, data: ManifestEntryUpdate) =>
    api.put<ApiResponse<unknown>>(`/api/manifests/${manifestId}/entries/${entryId}`, data),
  myToday: () => api.get<ApiResponse<Manifest>>('/api/manifests/my/today'),
  myHistory: (params: { page?: number; limit?: number } = {}) =>
    api.get<PaginatedResponse<Manifest>>('/api/manifests/my/history', {
      page: params.page,
      limit: params.limit,
    }),
  agentsLite: () => api.get<unknown>('/api/agents', { limit: 100 }),
};
