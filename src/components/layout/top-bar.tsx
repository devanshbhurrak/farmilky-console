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
      {headerAction && <div className="flex items-center">{headerAction}</div>}
      <DropdownMenu
        trigger={
          <button className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100" aria-label="User menu">
            <Avatar name={user?.name} className="size-9" />
          </button>
        }
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.phone ?? user?.email ?? user?.role}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(user?.role === 'admin' ? '/permissions' : '/agent/profile')}>
          <User className="size-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            logout();
            navigate('/login');
          }}
          danger
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenu>
    </header>
  );
}
