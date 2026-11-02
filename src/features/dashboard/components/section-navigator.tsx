import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_ITEMS } from '@/lib/navigation';

export function SectionNavigator() {
  const items = NAV_ITEMS.filter((i) => i.adminOnly && i.path !== '/');

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900">Console Shortcuts</h3>
          <p className="text-xs text-slate-500">Fast access to admin management portals</p>
        </div>
      </div>

      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="group rounded-xl focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
          >
            <Card className="h-full border-slate-200/80 bg-surface transition-all duration-150 group-hover:border-slate-300 group-hover:shadow-sm active:scale-[0.98]">
              <CardContent className="flex items-center gap-2.5 p-2.5 sm:p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-100">
                  <item.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 text-xs font-semibold text-slate-800 group-hover:text-primary-700 truncate">
                  {item.label}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
