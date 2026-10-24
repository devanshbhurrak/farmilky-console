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

export function toArea(raw: unknown): Area {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    ...(o as unknown as Area),
    id: String(o.id ?? ''),
    name: String(o.name ?? ''),
    pincodes: Array.isArray(o.pincodes) ? (o.pincodes as string[]) : [],
    localities: Array.isArray(o.localities) ? (o.localities as string[]) : [],
    assignedAgent:
      (o.assignedAgentId as string | null | undefined) ??
      (o.assignedAgent as Area['assignedAgent']) ??
      null,
    assignedAgentName:
      (o.assignedAgentName as string | null | undefined) ??
      (o.agentName as string | null | undefined) ??
      null,
    sequence: Number(o.sortOrder ?? o.sequence ?? 0),
    isActive: o.isActive !== false,
  };
}

function toAreaPayload(data: AreaInput): Record<string, unknown> {
  return {
    name: data.name,
    pincodes: data.pincodes,
    localities: data.localities,
    assignedAgentId: data.assignedAgent || null,
    sortOrder: data.sequence,
  };
}

export const areasApi = {
  list: () => api.get<ApiResponse<Area[]>>('/api/areas'),
  get: (id: string) => api.get<ApiResponse<Area>>(`/api/areas/${id}`),
  create: (data: AreaInput) => api.post<ApiResponse<Area>>('/api/areas', toAreaPayload(data)),
  update: (id: string, data: AreaInput) =>
    api.put<ApiResponse<Area>>(`/api/areas/${id}`, toAreaPayload(data)),
  remove: (id: string) => api.delete<ApiResponse<unknown>>(`/api/areas/${id}`),
  agents: () => api.get<unknown>('/api/areas/agents'),
  areaCustomers: (areaId: string) =>
    api.get<ApiResponse<AreaCustomer[]> | ApiResponse<{ customers: AreaCustomer[] }>>(
      `/api/areas/${areaId}/customers`,
    ),
  updateCustomers: (
    areaId: string,
    assign: { userId: string; deliverySequence?: number }[],
    remove: string[],
  ) =>
    api.put<ApiResponse<AreaCustomer[]>>(`/api/areas/${areaId}/customers`, { assign, remove }),
  searchCustomers: (params?: CustomerSearchParams) =>
    api.get<unknown>('/api/users/admin/all', {
      role: 'customer',
      ...(params ?? {}),
    } as QueryParams),
};
