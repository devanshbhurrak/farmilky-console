import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { Milk } from 'lucide-react';
import { NAV_GROUPS, NAV_ITEMS } from '@/lib/navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { isAdmin, hasPermission } = useAuth();
  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.permission) return isAdmin || hasPermission(item.permission);
    return true;
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-[var(--topbar-height)] items-center gap-2 border-b border-slate-100 px-5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white">
          <Milk className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-base font-semibold text-slate-900">Farmilky</p>
          <p className="text-xs text-slate-500">Management Portal</p>
        </div>
      </div>
      <nav className="scroll-thin flex-1 overflow-y-auto p-3" aria-label="Primary">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group.key);
          if (groupItems.length === 0) return null;
          return (
            <Fragment key={group.key}>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase first:pt-2">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {groupItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive ? 'bg-primary-50 text-primary-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )
                      }
                    >
                      <item.icon className="size-4.5 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </Fragment>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3 text-xs text-slate-400">Farmilky Management v2</div>
    </aside>
  );
}
