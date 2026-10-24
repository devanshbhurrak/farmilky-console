import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Milk } from 'lucide-react';
import { useHeaderAction } from './header-action-context';

export function MobileHeader({ title }: { title?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { headerAction } = useHeaderAction();
  const derived = title ?? deriveTitle(location.pathname);
  const isDetailPage = location.pathname.split('/').filter(Boolean).length > 1;
  return (
    <header className="sticky top-0 z-20 flex h-[var(--mobile-header-height)] items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
      {isDetailPage ? (
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex size-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="size-5" />
        </button>
      ) : (
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Milk className="size-4" />
        </span>
      )}
      <h1 className="truncate text-base font-semibold text-slate-900">{derived}</h1>
      {headerAction && (
        <div className="ml-auto flex items-center gap-2 shrink-0">{headerAction}</div>
      )}
    </header>
  );
}

export function deriveTitle(pathname: string): string {
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
