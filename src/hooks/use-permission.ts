import { useAuth } from '@/features/auth/auth-provider';
import type { PermissionKey } from '@/types/permission';

export function usePermission(key?: PermissionKey): boolean {
  const { hasPermission } = useAuth();
  if (!key) return true;
  return hasPermission(key);
}
