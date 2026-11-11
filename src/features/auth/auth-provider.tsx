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

/**
 * Stable hasPermission function that doesn't change between renders.
 * Uses a ref to always access the latest user/permissions without
 * causing the context value to recompute.
 */
function createHasPermission(
  getUser: () => AuthUser | null,
  getPermissions: () => PermissionKey[]
): (key: PermissionKey | string) => boolean {
  return (key: PermissionKey | string): boolean => {
    const user = getUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (key === '*') return true;
    return getPermissions().includes(key as PermissionKey);
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [permissions, setPermissions] = React.useState<PermissionKey[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const queryClient = useQueryClient();

  // Refs to provide stable access to latest state for hasPermission
  const userRef = React.useRef(user);
  userRef.current = user;
  const permissionsRef = React.useRef(permissions);
  permissionsRef.current = permissions;

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

  // Stable hasPermission - created once, uses refs to access current state
  const hasPermission = React.useMemo(
    () => createHasPermission(
      () => userRef.current,
      () => permissionsRef.current
    ),
    []
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
    // Remove hasPermission from deps since it's now stable
    [user, permissions, isLoading, login, logout, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
