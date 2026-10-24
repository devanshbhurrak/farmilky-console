import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { Manifest, ManifestListParams } from '@/types/manifest';

export interface GenerateManifestRequest {
  date: string;
  slot?: string;
}

export function toManifest(raw: unknown): Manifest {
  const o = (raw ?? {}) as Record<string, unknown>;
  const agent = (o.agent ?? null) as { id?: string; name?: string } | null;
  const area = (o.area ?? null) as { id?: string; name?: string } | null;
  const entries = Array.isArray(o.entries) ? (o.entries as Manifest['entries']) : [];
  const delivered = (entries ?? []).filter((e) => e.status === 'delivered').length;
  const failed = (entries ?? []).filter((e) => e.status === 'failed').length;
  const pending = (entries ?? []).filter((e) => e.status === 'pending').length;
  return {
    id: String(o.id ?? ''),
    agentId: agent?.id ?? (o.agentId as Manifest['agentId']) ?? '',
    agentName: agent?.name ?? (o.agentName as string | undefined),
    areaId: area ? { id: area.id ?? '', name: area.name ?? '' } : (o.areaId as Manifest['areaId']),
    areaName: area?.name ?? (o.areaName as string | undefined),
    date: String(o.manifestDate ?? o.date ?? ''),
    slot: (o.deliverySlot as string | undefined) ?? (o.slot as string | undefined),
    status: String(o.status ?? 'active'),
    entries,
    summary:
      (o.summary as Manifest['summary']) ?? {
        total: entries?.length ?? 0,
        delivered,
        failed,
        pending,
      },
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
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
