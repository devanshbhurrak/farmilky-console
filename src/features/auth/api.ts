import { api } from '@/lib/api-client';
import type { AuthUser, LoginRequest } from '@/types/auth';
import type { PermissionKey } from '@/types/permission';

interface ProfileResponse {
  success: boolean;
  data: { user: AuthUser } | AuthUser;
}

interface MyPermissionsResponse {
  success: boolean;
  data: PermissionKey[] | { permissions: PermissionKey[] };
}

function extractUser(payload: ProfileResponse['data']): AuthUser {
  if (payload && typeof payload === 'object' && 'user' in payload) {
    return (payload as { user: AuthUser }).user;
  }
  return payload as AuthUser;
}

export const authApi = {
  // Map the portal form shape to the backend contract
  // ({ emailOrPhone, password, tenantSlug } — slug is required).
  login: (body: LoginRequest) =>
    api.post<{ success: boolean; data: { user: AuthUser } | AuthUser }>(
      '/api/users/login',
      {
        emailOrPhone: body.identifier,
        password: body.password,
        tenantSlug: body.tenantSlug,
      },
    ),
  logout: () => api.post<{ success: boolean }>('/api/users/logout'),
  profile: async (): Promise<AuthUser> => {
    const res = await api.get<ProfileResponse>('/api/users/profile');
    return extractUser(res.data ?? (res as unknown as ProfileResponse['data']));
  },
  myPermissions: async (): Promise<PermissionKey[]> => {
    const res = await api.get<MyPermissionsResponse>('/api/permissions/my');
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as { permissions?: PermissionKey[] }).permissions)) {
      return (data as { permissions: PermissionKey[] }).permissions;
    }
    return [];
  },
  extractUser,
};
