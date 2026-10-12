import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils';

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { isAdmin, hasPermission } = useAuth();
  const visible = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.permission) return isAdmin || hasPermission(item.permission);
    return true;
  });

  const primary = visible.filter((i) => i.bottomNav).slice(0, 4);
  const showMore = visible.length > primary.length;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile"
    >
      <div className="grid h-[var(--bottom-nav-height)] grid-cols-5">
        {primary.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 p-2 text-[11px] font-medium',
                isActive ? 'text-primary-700' : 'text-slate-500',
              )
            }
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </NavLink>
        ))}
        {showMore ? (
          <button
            onClick={onMore}
            className="flex cursor-pointer flex-col items-center justify-center gap-1 p-2 text-[11px] font-medium text-slate-500"
            aria-label="More sections"
          >
            <MoreHorizontal className="size-5" aria-hidden />
            More
          </button>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
