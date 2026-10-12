import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, getName } from '@/lib/utils';
import type { Invoice } from '@/types/invoice';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function periodLabel(invoice: Invoice): string {
  const month = invoice.billingPeriod?.month;
  const year = invoice.billingPeriod?.year;
  if (typeof month === 'number' && typeof year === 'number') {
    return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
  }
  return '—';
}

export function customerLabel(invoice: Invoice): string {
  if (invoice.customerName) return invoice.customerName;
  return getName(invoice.userId, 'Customer');
}

export function InvoiceCard({ invoice, onClick }: { invoice: Invoice; onClick?: () => void }) {
  return (
    <Card>
      <button
        type="button"
        onClick={onClick}
        className="block w-full cursor-pointer text-left"
        aria-label={`Open invoice ${invoice.invoiceNumber}`}
      >
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
              <p className="truncate text-xs text-slate-500">
                {customerLabel(invoice)} · {periodLabel(invoice)}
              </p>
            </div>
            <StatusBadge status={String(invoice.status)} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs text-slate-500">Net due</span>
            <span className="font-semibold text-slate-900">{formatCurrency(invoice.netAmountDue)}</span>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}
