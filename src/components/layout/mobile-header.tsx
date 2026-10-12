import { useLocation } from 'react-router-dom';
import { Milk } from 'lucide-react';

export function MobileHeader({ title }: { title?: string }) {
  const location = useLocation();
  const derived = title ?? deriveTitle(location.pathname);
  return (
    <header className="sticky top-0 z-20 flex h-[var(--mobile-header-height)] items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-white">
        <Milk className="size-4" />
      </span>
      <h1 className="truncate text-base font-semibold text-slate-900">{derived}</h1>
    </header>
  );
}

function deriveTitle(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (!seg) return 'Dashboard';
  const map: Record<string, string> = {
    orders: 'Orders',
    subscriptions: 'Subscriptions',
    customers: 'Customers',
    products: 'Products',
    payments: 'Payments',
    expenses: 'Expenses',
    invoices: 'Invoices',
    balances: 'Balances',
    areas: 'Areas',
    agents: 'Agents',
    manifests: 'Manifests',
    suppliers: 'Suppliers',
    'milk-collections': 'Milk Collection',
    complaints: 'Complaints',
    returns: 'Returns',
    holidays: 'Holidays',
    messages: 'Messages',
    permissions: 'Permissions',
    deliveries: 'Delivery Board',
    agent: 'My Route',
  };
  return map[seg] ?? 'Farmilky';
}
