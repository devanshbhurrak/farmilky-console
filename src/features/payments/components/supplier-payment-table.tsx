import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate, getName } from '@/lib/utils';
import type { SupplierPayment } from '@/types/payment';

export function SupplierPaymentCard({ payment }: { payment: SupplierPayment }) {
  const supplier = payment.supplierName ?? getName(payment.supplierId, 'Supplier');
  const period =
    payment.fromDate || payment.toDate
      ? `${payment.fromDate ? formatDate(payment.fromDate) : '—'} → ${payment.toDate ? formatDate(payment.toDate) : '—'}`
      : '—';

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{supplier}</p>
            <p className="text-xs text-slate-500">{period}</p>
          </div>
          <p className="text-base font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{payment.date ? formatDate(payment.date) : payment.createdAt ? formatDate(payment.createdAt) : '—'}</span>
          {payment.paymentMethod ? <StatusBadge status={payment.paymentMethod} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}
