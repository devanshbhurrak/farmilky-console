import { api, ApiError } from '@/lib/api-client';
import { getId, getName, normalizeList, unwrapData } from '@/lib/utils';
import type { Agent, AgentListParams } from '@/types/agent';
import type { Manifest, ManifestEntry } from '@/types/manifest';

type RawRecord = Record<string, unknown>;

/**
 * Backend agents are shaped as `{ user, agentProfile, area }`. Older/legacy
 * payloads are flat. Normalise both so the UI never renders blank rows.
 */
export function toAgent(raw: unknown): Agent {
  const root = (raw ?? {}) as RawRecord;
  const user = (root.user && typeof root.user === 'object' ? root.user : root) as RawRecord;
  const profile = (root.agentProfile ?? user.agentInfo ?? {}) as RawRecord;
  const area = (root.area ?? profile.assignedArea ?? user.assignedArea) as unknown;
  const id = getId(user) || getId(root) || String(user.id ?? '');

  return {
    id,
    name: String(user.name ?? ''),
    email: (user.email as string | null | undefined) ?? null,
    phone: (user.phone as string | null | undefined) ?? null,
    role: user.role !== undefined ? String(user.role) : undefined,
    isActive: user.isActive !== false,
    agentInfo: {
      joiningDate: (profile.joiningDate as string | null | undefined) ?? null,
      vehicleType: (profile.vehicleType as string | null | undefined) ?? null,
      maxCapacity:
        profile.maxCapacity !== undefined && profile.maxCapacity !== null
          ? Number(profile.maxCapacity)
          : null,
      assignedArea: getId(area) || (typeof area === 'string' ? area : null),
    },
    assignedAreaName:
      (root.assignedAreaName as string | null | undefined) ??
      getName(area, '') ??
      null,
    createdAt: String(user.createdAt ?? new Date().toISOString()),
  };
}

/** Flatten the nested form shape into the backend's flat agent payload. */
function toAgentPayload(data: unknown, mode: 'create' | 'update'): RawRecord {
  const o = (data ?? {}) as RawRecord;
  const info = (o.agentInfo ?? {}) as RawRecord;
  const payload: RawRecord = {
    name: o.name,
    phone: o.phone,
    email: o.email || null,
  };
  if (o.password) payload.password = o.password;
  if (mode === 'create') payload.role = o.role ?? 'delivery';
  if (info.assignedArea) payload.assignedAreaId = info.assignedArea;
  else if (mode === 'update') payload.assignedAreaId = null;
  if (info.joiningDate) payload.joiningDate = info.joiningDate;
  if (info.vehicleType) payload.vehicleType = info.vehicleType;
  if (info.maxCapacity !== undefined && info.maxCapacity !== null) {
    payload.maxCapacity = info.maxCapacity;
  }
  return payload;
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
    const wantsActive = (data as { isActive?: boolean } | null)?.isActive;
    const res = await api.post<unknown>('/api/agents', toAgentPayload(data, 'create'));
    const created = toAgent(unwrapData<unknown>(res));
    if (wantsActive === false) {
      await api.patch<unknown>(`/api/agents/${created.id}/status`, { isActive: false });
      return { ...created, isActive: false };
    }
    return created;
  },

  async update(id: string, data: unknown): Promise<Agent> {
    const wantsActive = (data as { isActive?: boolean } | null)?.isActive;
    const res = await api.put<unknown>(`/api/agents/${id}`, toAgentPayload(data, 'update'));
    const updated = toAgent(unwrapData<unknown>(res));
    if (wantsActive !== undefined && wantsActive !== updated.isActive) {
      await api.patch<unknown>(`/api/agents/${id}/status`, { isActive: wantsActive });
      return { ...updated, isActive: wantsActive };
    }
    return updated;
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
