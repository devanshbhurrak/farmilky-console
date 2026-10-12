import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/invoice';

export function InvoiceLineItems({ invoice }: { invoice: Invoice }) {
  const [expanded, setExpanded] = useState(false);
  const lineItems = invoice.lineItems ?? [];
  const productSummary = invoice.productSummary ?? [];

  const summaryRows: { label: string; value: number; tone?: string }[] = [
    { label: 'Previous balance', value: Number(invoice.previousBalance ?? 0) },
    { label: 'Total charges', value: Number(invoice.totalCharges ?? 0) },
    { label: 'Order credits', value: -(Number(invoice.orderCredits ?? 0)) },
    { label: 'Total payments', value: -(Number(invoice.totalPayments ?? 0)) },
    { label: 'Total adjustments', value: Number(invoice.totalAdjustments ?? 0) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ledger summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {summaryRows.map((row) => (
              <div key={row.label} className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">{row.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{formatCurrency(row.value)}</dd>
              </div>
            ))}
            <div className="rounded-lg bg-slate-900 p-3">
              <dt className="text-xs text-slate-300">Net amount due</dt>
              <dd className="mt-0.5 text-sm font-semibold text-white">{formatCurrency(invoice.netAmountDue)}</dd>
            </div>
          </dl>

          {productSummary.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-140 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {productSummary.map((p, i) => (
                    <tr key={`${p.productName}-${i}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-900">{p.productName}</p>
                        {p.variantLabel ? <p className="text-xs text-slate-500">{p.variantLabel}</p> : null}
                        {p.rateBreakdown ? <p className="text-xs text-slate-400">{p.rateBreakdown}</p> : null}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {p.totalQuantity} {p.unit ?? ''}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-900">{formatCurrency(p.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {lineItems.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Line items ({lineItems.length})
                <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded ? (
                <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-160 border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={String(item.id ?? i)} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2 text-slate-700">{formatDate(item.date)}</td>
                          <td className="px-4 py-2 text-slate-700">
                            {item.description}
                            {item.productName ? <span className="text-slate-400"> · {item.productName}</span> : null}
                          </td>
                          <td className="px-4 py-2 text-slate-700">
                            {item.quantity ?? '—'}{item.unit ? ` ${item.unit}` : ''}
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-900">{formatCurrency(item.amount)}</td>
                          <td className="px-4 py-2">
                            {item.entryType ? <StatusBadge status={item.entryType} /> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
