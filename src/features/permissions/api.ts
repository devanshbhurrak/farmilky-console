import { api } from '@/lib/api-client';
import type { PermissionAssignment, PermissionDefinition } from '@/types/permission';
import { normalizeList, unwrapData } from '@/lib/utils';

export interface AdminUserLite {
  id: string;
  name: string;
  phone?: string | null;
  role: string;
}

export const permissionsApi = {
  registry: async (): Promise<PermissionDefinition[]> => {
    const res = await api.get<unknown>('/api/permissions/registry');
    const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
    if (Array.isArray(unwrapped)) return unwrapped as PermissionDefinition[];
    if (unwrapped && typeof unwrapped === 'object') {
      const obj = unwrapped as Record<string, unknown>;
      for (const key of ['permissions', 'registry', 'definitions']) {
        if (Array.isArray(obj[key])) return obj[key] as PermissionDefinition[];
      }
    }
    return [];
  },
  roles: async (): Promise<string[]> => {
    const res = await api.get<unknown>('/api/permissions/roles');
    const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
    if (Array.isArray(unwrapped)) {
      return unwrapped.map((r) => (typeof r === 'string' ? r : String((r as { role?: unknown }).role ?? (r as { name?: unknown }).name ?? ''))).filter(Boolean);
    }
    if (unwrapped && typeof unwrapped === 'object') {
      const obj = unwrapped as Record<string, unknown>;
      for (const key of ['roles', 'data']) {
        if (Array.isArray(obj[key])) {
          return (obj[key] as unknown[]).map((r) => (typeof r === 'string' ? r : String((r as { role?: unknown }).role ?? ''))).filter(Boolean);
        }
      }
      // roles() response may be a map role -> permissions
      const keys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
      if (keys.length > 0) return keys;
    }
    return [];
  },
  getRolePermissions: async (role: string): Promise<string[]> => {
    try {
      const res = await api.get<unknown>(`/api/permissions/roles/${role}`);
      const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
      if (Array.isArray(unwrapped)) return unwrapped.map((p) => String(p));
      if (unwrapped && typeof unwrapped === 'object') {
        const obj = unwrapped as Record<string, unknown>;
        if (Array.isArray(obj.permissions)) return (obj.permissions as unknown[]).map((p) => String(p));
      }
      return [];
    } catch {
      return [];
    }
  },
  updateRole: async (role: string, permissions: string[]): Promise<void> => {
    await api.put<unknown>(`/api/permissions/roles/${role}`, { permissions });
  },
  resetRole: async (role: string): Promise<void> => {
    await api.post<unknown>(`/api/permissions/roles/${role}/reset`);
  },
  list: async (): Promise<PermissionAssignment[]> => {
    try {
      const res = await api.get<unknown>('/api/permissions');
      const { items } = normalizeList<PermissionAssignment>(res, ['assignments']);
      if (items.length > 0) return items;
      const unwrapped = unwrapData<unknown>(res as { success?: boolean; data?: unknown });
      return Array.isArray(unwrapped) ? (unwrapped as PermissionAssignment[]) : [];
    } catch {
      return [];
    }
  },
  setUserPermissions: async (userId: string, permissions: string[]): Promise<void> => {
    await api.put<unknown>(`/api/permissions/${userId}`, { permissions });
  },
  searchUsers: async (params: { search?: string; role?: string }): Promise<AdminUserLite[]> => {
    const res = await api.get<unknown>('/api/users/admin/all', {
      search: params.search,
      role: params.role,
      limit: 20,
    });
    const { items } = normalizeList<AdminUserLite>(res, ['users']);
    return items;
  },
};
