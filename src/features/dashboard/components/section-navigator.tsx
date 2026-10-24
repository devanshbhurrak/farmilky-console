import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_ITEMS } from '@/lib/navigation';

export function SectionNavigator() {
  const items = NAV_ITEMS.filter((i) => i.adminOnly && i.path !== '/');
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <Link key={item.path} to={item.path} className="rounded-xl focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none">
          <Card className="hover:shadow-md">
            <CardContent className="flex flex-col items-center gap-1.5 px-2 py-3 text-center sm:flex-row sm:gap-2.5 sm:px-4 sm:text-left">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <item.icon className="size-4.5" aria-hidden />
              </span>
              <span className="min-w-0 text-xs font-medium break-words text-slate-800 sm:text-sm">{item.label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
