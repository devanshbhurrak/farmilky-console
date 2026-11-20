import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { deriveTitle } from './mobile-header';
import { useHeaderAction } from './header-action-context';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = deriveTitle(location.pathname);
  const { headerAction } = useHeaderAction();

  return (
    <header className="sticky top-0 z-20 hidden h-[var(--topbar-height)] items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur lg:flex">
      <div className="flex flex-col">
        <span className="text-base font-semibold text-slate-900">{pageTitle}</span>
        <span className="text-xs text-slate-500">Welcome back, {user?.name ?? 'User'}</span>
      </div>
      {headerAction && <div className="flex items-center justify-end">{headerAction}</div>}
    </header>
  );
}
