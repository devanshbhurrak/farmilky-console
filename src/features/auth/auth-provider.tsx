import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from './api';
import { queryKeys } from '@/lib/query-keys';
import type { AuthUser, LoginRequest } from '@/types/auth';
import type { PermissionKey } from '@/types/permission';

interface AuthContextValue {
  user: AuthUser | null;
  permissions: PermissionKey[];
  isLoading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  login: (input: LoginRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasPermission: (key: PermissionKey | string) => boolean;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

const PORTAL_ROLES = new Set(['admin', 'delivery', 'delivery_partner', 'agent']);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [permissions, setPermissions] = React.useState<PermissionKey[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const queryClient = useQueryClient();

  const loadSession = React.useCallback(async () => {
    try {
      const profile = await authApi.profile();
      if (profile && !PORTAL_ROLES.has(profile.role)) {
        setUser(null);
        setPermissions([]);
        return;
      }
      setUser(profile);
      if (profile) {
        try {
          const perms = await authApi.myPermissions();
          setPermissions(perms);
        } catch {
          setPermissions([]);
          toast.error('Failed to load permissions. Some features may be unavailable.');
        }
      }
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSession();
  }, [loadSession]);

  React.useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setPermissions([]);
      setIsLoading(false);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = React.useCallback(
    async (input: LoginRequest): Promise<AuthUser> => {
      const res = await authApi.login(input);
      const loggedIn = authApi.extractUser(res.data);
      if (loggedIn && !PORTAL_ROLES.has(loggedIn.role)) {
        await authApi.logout().catch(() => {});
        throw new Error('This account does not have portal access.');
      }
      setUser(loggedIn);
      try {
        const perms = await authApi.myPermissions();
        setPermissions(perms);
      } catch {
        setPermissions([]);
        toast.error('Failed to load permissions. Some features may be unavailable.');
      }
      queryClient.setQueryData(queryKeys.auth.profile(), loggedIn);
      return loggedIn;
    },
    [queryClient],
  );

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore — clear local state regardless */
    }
    setUser(null);
    setPermissions([]);
    queryClient.clear();
  }, [queryClient]);

  const hasPermission = React.useCallback(
    (key: PermissionKey | string): boolean => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (key === '*') return true;
      return permissions.includes(key as PermissionKey);
    },
    [user, permissions],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isLoading,
      isAdmin: user?.role === 'admin',
      isAgent: user !== null && (user.role === 'agent' || user.role === 'delivery_partner'),
      login,
      logout,
      hasPermission,
      refresh: loadSession,
    }),
    [user, permissions, isLoading, login, logout, hasPermission, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
