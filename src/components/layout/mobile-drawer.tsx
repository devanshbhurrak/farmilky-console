import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NAV_ITEMS } from '@/lib/navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function MobileDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, isAdmin, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.permission) return isAdmin || hasPermission(item.permission);
    return true;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar name={user?.name} />
            <div>
              <SheetTitle>{user?.name ?? 'User'}</SheetTitle>
              <p className="text-xs text-slate-500">{user?.phone ?? user?.email ?? user?.role}</p>
            </div>
          </div>
        </SheetHeader>
        <SheetBody>
          <nav aria-label="All sections" className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-xl border p-3 text-sm font-medium',
                    isActive
                      ? 'border-primary-200 bg-primary-50 text-primary-800'
                      : 'border-slate-200 bg-white text-slate-700',
                  )
                }
              >
                <item.icon className="size-4.5 shrink-0" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => {
              logout();
              onOpenChange(false);
              navigate('/login');
            }}
            className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-600"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
