import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { permissionsApi } from './api';
import { queryKeys } from '@/lib/query-keys';
import { ALL_PERMISSIONS } from '@/types/permission';
import { getErrorMessage } from '@/lib/utils';

const FALLBACK_ROLES = ['agent', 'delivery', 'delivery_partner'];

export function usePermissionRegistry() {
  return useQuery({
    queryKey: queryKeys.permissions.registry(),
    queryFn: async () => {
      try {
        const items = await permissionsApi.registry();
        return items.length > 0 ? items : ALL_PERMISSIONS;
      } catch {
        return ALL_PERMISSIONS;
      }
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.permissions.roles(),
    queryFn: async () => {
      try {
        const roles = await permissionsApi.roles();
        return roles.length > 0 ? roles : FALLBACK_ROLES;
      } catch {
        return FALLBACK_ROLES;
      }
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRolePermissions(role: string) {
  return useQuery({
    queryKey: [...queryKeys.permissions.roles(), role] as const,
    queryFn: () => permissionsApi.getRolePermissions(role),
    enabled: role.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) =>
      permissionsApi.updateRole(role, permissions),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.roles() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.permissions.roles(), vars.role] });
      toast.success('Role permissions updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useResetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: string) => permissionsApi.resetRole(role),
    onSuccess: (_data, role) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.roles() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.permissions.roles(), role] });
      toast.success('Role permissions reset');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function usePermissionAssignments() {
  return useQuery({
    queryKey: queryKeys.permissions.all(),
    queryFn: () => permissionsApi.list(),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useSetUserPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: string[] }) =>
      permissionsApi.setUserPermissions(userId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all() });
      toast.success('User permissions updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAdminUserSearch(search: string, role: string) {
  return useQuery({
    queryKey: ['permissions', 'user-search', search, role],
    queryFn: () => permissionsApi.searchUsers({ search: search || undefined, role: role || undefined }),
    placeholderData: keepPreviousData,
  });
}
