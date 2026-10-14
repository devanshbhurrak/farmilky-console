import { api, ApiError } from '@/lib/api-client';
import { getId, getName, normalizeList, unwrapData } from '@/lib/utils';
import type { Agent, AgentListParams } from '@/types/agent';
import type { Manifest, ManifestEntry } from '@/types/manifest';

type RawRecord = Record<string, unknown>;

export function toAgent(raw: unknown): Agent {
  const o = (raw ?? {}) as RawRecord;
  return {
    id: getId(raw) || String(o.id ?? ''),
    name: String(o.name ?? ''),
    email: (o.email as string | null | undefined) ?? null,
    phone: (o.phone as string | null | undefined) ?? null,
    role: o.role !== undefined ? String(o.role) : undefined,
    isActive: o.isActive !== false,
    agentInfo: (o.agentInfo as Agent['agentInfo']) ?? null,
    assignedAreaName:
      (o.assignedAreaName as string | null | undefined) ??
      getName((o.agentInfo as RawRecord | undefined)?.assignedArea, '') ??
      null,
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
}

export interface AgentToday {
  manifestId: string | null;
  entries: ManifestEntry[];
  summary: { total: number; delivered: number; failed: number; pending: number };
}

function toAgentToday(res: unknown): AgentToday {
  const data = unwrapData<RawRecord | RawRecord[] | null>(res as { data?: RawRecord | RawRecord[] | null } | RawRecord | null);
  const root: RawRecord = Array.isArray(data) ? { entries: data } : ((data ?? {}) as RawRecord);
  const manifest = (root.manifest ?? root) as RawRecord;
  const entries = (Array.isArray(root.entries) ? root.entries : Array.isArray(manifest.entries) ? manifest.entries : []) as ManifestEntry[];
  const summaryRaw = (root.summary ?? manifest.summary ?? {}) as RawRecord;
  const delivered = Number(summaryRaw.delivered ?? entries.filter((e) => e.status === 'delivered').length ?? 0);
  const failed = Number(summaryRaw.failed ?? entries.filter((e) => e.status === 'failed').length ?? 0);
  const total = Number(summaryRaw.total ?? entries.length ?? 0);
  const pending = Number(summaryRaw.pending ?? Math.max(total - delivered - failed, 0));
  const manifestId =
    (typeof root.manifestId === 'string' ? root.manifestId : null) ??
    (typeof manifest.id === 'string' ? manifest.id : null) ??
    (getId(root) || null);
  return { manifestId, entries, summary: { total, delivered, failed, pending } };
}

export const agentsApi = {
  async list(params: AgentListParams = {}): Promise<{
    items: Agent[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get<unknown>('/api/agents', {
      ...(params as Record<string, string | number | boolean | null | undefined>),
    });
    const { items, meta } = normalizeList<unknown>(res, ['agents', 'users']);
    return { items: items.map(toAgent), meta };
  },

  async get(id: string): Promise<Agent> {
    const res = await api.get<unknown>(`/api/agents/${id}`);
    return toAgent(unwrapData<unknown>(res));
  },

  async create(data: unknown): Promise<Agent> {
    const res = await api.post<unknown>('/api/agents', data);
    return toAgent(unwrapData<unknown>(res));
  },

  async update(id: string, data: unknown): Promise<Agent> {
    const res = await api.put<unknown>(`/api/agents/${id}`, data);
    return toAgent(unwrapData<unknown>(res));
  },

  /** Agents are users — delivery config lives on the users admin endpoint. */
  async updateDeliveryConfig(id: string, data: unknown): Promise<Agent> {
    const res = await api.put<unknown>(`/api/users/admin/${id}/delivery-config`, data);
    return toAgent(unwrapData<unknown>(res));
  },

  async setStatus(id: string, isActive: boolean): Promise<Agent> {
    const res = await api.patch<unknown>(`/api/agents/${id}/status`, { isActive });
    return toAgent(unwrapData<unknown>(res));
  },

  async remove(id: string): Promise<void> {
    await api.delete<unknown>(`/api/agents/${id}`);
  },

  async myToday(): Promise<AgentToday | null> {
    try {
      const res = await api.get<unknown>('/api/manifests/my/today');
      return toAgentToday(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async areasLite(): Promise<{ id: string; name: string }[]> {
    const res = await api.get<unknown>('/api/areas');
    const { items } = normalizeList<RawRecord>(res, ['areas']);
    return items.map((a) => ({ id: getId(a) || String(a.id ?? ''), name: String(a.name ?? '') }));
  },
};

export type { Manifest };
