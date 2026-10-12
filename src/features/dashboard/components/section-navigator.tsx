import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_ITEMS } from '@/lib/navigation';

export function SectionNavigator() {
  const items = NAV_ITEMS.filter((i) => i.adminOnly && i.path !== '/');
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.path} to={item.path} className="rounded-xl focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex min-h-11 items-center gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <item.icon className="size-4.5" aria-hidden />
              </span>
              <span className="text-sm font-medium text-slate-800">{item.label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
