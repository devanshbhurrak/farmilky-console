import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_ITEMS } from '@/lib/navigation';

export function SectionNavigator() {
  const [open, setOpen] = React.useState(false);
  const items = NAV_ITEMS.filter((i) => i.adminOnly && i.path !== '/');
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="min-h-11 w-full sm:w-auto">
        <LayoutGrid /> View all modules <ChevronDown />
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" onClick={() => setOpen(false)} className="min-h-11 w-full sm:w-auto">
        <LayoutGrid /> Hide modules <ChevronUp />
      </Button>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
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
    </div>
  );
}
