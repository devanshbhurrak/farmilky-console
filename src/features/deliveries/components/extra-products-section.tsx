import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/form/form-field';
import { useAuth } from '@/features/auth/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, getId, getName, normalizeList } from '@/lib/utils';
import { deliveriesApi } from '../api';
import { useInstantDelivery } from '../hooks';

interface LiteProduct {
  id: string;
  name: string;
  basePrice?: number | null;
  price?: number;
}

interface ExtraRow {
  productId: string;
  quantity: string;
  price: string;
}

export function ExtraProductsSection({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<ExtraRow[]>([{ productId: '', quantity: '1', price: '' }]);
  const [paymentMode, setPaymentMode] = useState('COD');
  const instantDelivery = useInstantDelivery();

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ lite: true }),
    queryFn: async () => {
      const res = await deliveriesApi.productsLite();
      return normalizeList<LiteProduct>(res, ['products']).items;
    },
    placeholderData: keepPreviousData,
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  const products = productsQuery.data ?? [];

  const updateRow = (index: number, patch: Partial<ExtraRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const autofillPrice = (index: number, productId: string) => {
    const product = products.find((p) => getId(p) === productId);
    updateRow(index, {
      productId,
      price: product ? String(product.basePrice ?? product.price ?? '') : '',
    });
  };

  const submit = () => {
    const items = rows
      .filter((r) => r.productId)
      .map((r) => ({
        productId: r.productId,
        quantity: Number(r.quantity) || 0,
        price: Number(r.price) || 0,
      }))
      .filter((r) => r.quantity >= 1);
    if (items.length === 0) return;
    instantDelivery.mutate(
      { customerId, items, paymentMode },
      { onSuccess: () => setRows([{ productId: '', quantity: '1', price: '' }]) },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-600">
        Add extra products for <span className="font-semibold text-slate-900">{customerName}</span>
      </p>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
          <FormField label="Product">
            <Select value={row.productId} onChange={(e) => autofillPrice(i, e.target.value)}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={getId(p)} value={getId(p)}>
                  {getName(p)} · {formatCurrency(p.basePrice ?? p.price ?? 0)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Qty">
              <Input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => updateRow(i, { quantity: e.target.value })}
              />
            </FormField>
            <FormField label="Price">
              <Input
                type="number"
                min={0}
                step="any"
                value={row.price}
                onChange={(e) => updateRow(i, { price: e.target.value })}
              />
            </FormField>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
            className="self-start"
          >
            <Trash2 /> Remove
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, { productId: '', quantity: '1', price: '' }])} className="min-h-11 self-start">
        <Plus /> Add row
      </Button>
      <FormField label="Payment mode">
        <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
          <option value="COD">COD</option>
          <option value="online">Online</option>
          <option value="upi">UPI</option>
          <option value="subscription_ledger">Subscription ledger</option>
        </Select>
      </FormField>
      <Button onClick={submit} loading={instantDelivery.isPending} className="min-h-11">
        Deliver extras
      </Button>
    </div>
  );
}
