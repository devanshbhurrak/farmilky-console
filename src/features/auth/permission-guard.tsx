import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth-provider';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { EmptyState } from '@/components/data/empty-state';
import type { PermissionKey } from '@/types/permission';

export function PermissionGuard({ permission }: { permission: PermissionKey }) {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) return <LoadingScreen message="Checking access…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(permission)) {
    return (
      <div className="py-10">
        <EmptyState
          title="Access restricted"
          message="Your account does not have permission to view this section. Contact an administrator."
        />
      </div>
    );
  }
  return <Outlet />;
}
