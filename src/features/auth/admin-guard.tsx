import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth-provider';
import { LoadingScreen } from '@/components/feedback/loading-screen';

export function AdminGuard() {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) return <LoadingScreen message="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/agent" replace />;
  return <Outlet />;
}
