import * as React from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormField, FormSection } from '@/components/form/form-field';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, getId } from '@/lib/utils';
import { ordersApi } from '../api';
import { createOrderSchema } from '../schemas';
import type { CreateOrderInput } from '../schemas';
import { effectivePrice, variantKey } from '@/types/product';
import type { Product } from '@/types/product';

export function OrderForm({
  defaultValues,
  onSubmit,
  submitting,
  initialCustomerName,
}: {
  defaultValues?: Partial<CreateOrderInput>;
  onSubmit: (values: CreateOrderInput) => void | Promise<void>;
  submitting?: boolean;
  initialCustomerName?: string;
}) {
  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema) as unknown as Resolver<CreateOrderInput>,
    defaultValues: {
      userId: '',
      items: [],
      paymentMethod: 'COD',
      deliveryDate: '',
      notes: '',
      address: { street: '', city: '', state: '', pincode: '' },
      ...defaultValues,
    },
  });

  const { register, handleSubmit, control, setValue, formState: { errors } } = form;
  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });

  const [customerSearch, setCustomerSearch] = React.useState('');
  const [customerName, setCustomerName] = React.useState(initialCustomerName ?? '');
  const debouncedCustomerSearch = useDebounce(customerSearch, 400);

  const { data: customers } = useQuery({
    queryKey: ['customers', 'lite', debouncedCustomerSearch],
    queryFn: () => ordersApi.customersLite(debouncedCustomerSearch || undefined),
  });

  const { data: products } = useQuery({
    queryKey: queryKeys.products.list({ limit: 100 }),
    queryFn: () => ordersApi.productsLite(),
  });

  const [productPick, setProductPick] = React.useState('');

  const total = (items ?? []).reduce((s, it) => s + Number(it.quantity ?? 0) * Number(it.price ?? 0), 0);

  function productById(id: string): Product | undefined {
    return (products ?? []).find((p) => (getId(p) || p.id) === id);
  }

  function addItem() {
    if (!productPick) return;
    const product = productById(productPick);
    if (!product) return;
    const pid = getId(product) || product.id;
    const defaultVariant = product.variants?.find((v) => v.isDefault) ?? product.variants?.[0];
    append({
      productId: pid,
      variantId: defaultVariant ? variantKey(defaultVariant, product.variants?.indexOf(defaultVariant) ?? 0) : undefined,
      quantity: 1,
      price: defaultVariant ? effectivePrice(defaultVariant) : Number(product.price ?? 0),
    });
    setProductPick('');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormSection title="Customer">
        <FormField label="Search customer" required error={errors.userId?.message}>
          <Input
            placeholder="Type name or phone…"
            value={customerName ? `${customerName}` : customerSearch}
            onChange={(e) => {
              setCustomerName('');
              setCustomerSearch(e.target.value);
            }}
          />
        </FormField>
        {!customerName && customerSearch && (
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
            {(customers ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setValue('userId', c.id, { shouldValidate: true });
                  setCustomerName(c.name);
                  setCustomerSearch('');
                }}
                className="flex min-h-11 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="text-xs text-slate-500">{c.phone ?? ''}</span>
              </button>
            ))}
            {(customers ?? []).length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500">No customers found.</p>
            )}
          </div>
        )}
        {customerName && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span>
              Selected: <strong>{customerName}</strong>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCustomerName('');
                setValue('userId', '');
              }}
            >
              Change
            </Button>
          </div>
        )}
        <input type="hidden" {...register('userId')} />
      </FormSection>

      <FormSection title="Items" description="Add products, pick variants, set quantity and price">
        <FormField label="Add product">
          <div className="flex gap-2">
            <Select value={productPick} onChange={(e) => setProductPick(e.target.value)} aria-label="Pick product">
              <option value="">Select product</option>
              {(products ?? []).map((p) => (
                <option key={getId(p) || p.id} value={getId(p) || p.id}>
                  {p.name} · {formatCurrency(p.price)}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={addItem} disabled={!productPick} className="min-h-11 shrink-0">
              <Plus aria-hidden /> Add
            </Button>
          </div>
        </FormField>

        {errors.items?.message && <p role="alert" className="text-xs text-red-600">{errors.items.message}</p>}

        <div className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const item = items?.[index];
            const product = item ? productById(item.productId) : undefined;
            return (
              <div key={field.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{product?.name ?? item?.productId}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(index)} aria-label="Remove item">
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                {product?.variants && product.variants.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.variants.map((v, vi) => {
                      const key = variantKey(v, vi);
                      const selected = item?.variantId === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            update(index, {
                              productId: item?.productId ?? '',
                              variantId: key,
                              quantity: item?.quantity ?? 1,
                              price: effectivePrice(v),
                            })
                          }
                          className="min-h-9"
                        >
                          <Badge variant={selected ? 'default' : 'secondary'} className="cursor-pointer">
                            {v.label} · {formatCurrency(effectivePrice(v))}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <FormField label="Qty">
                    <Input
                      type="number"
                      min={1}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Price">
                    <Input type="number" min={0} {...register(`items.${index}.price`, { valueAsNumber: true })} />
                  </FormField>
                </div>
                <p className="mt-1 text-right text-xs text-slate-500">
                  Line total: {formatCurrency(Number(item?.quantity ?? 0) * Number(item?.price ?? 0))}
                </p>
              </div>
            );
          })}
          {fields.length === 0 && <p className="text-sm text-slate-500">No items yet. Add a product above.</p>}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">Order total</span>
          <span className="text-base font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>
      </FormSection>

      <FormSection title="Delivery & payment">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Payment method" error={errors.paymentMethod?.message}>
            <Select {...register('paymentMethod')}>
              <option value="COD">COD</option>
              <option value="online">Online</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
            </Select>
          </FormField>
          <FormField label="Delivery date" error={errors.deliveryDate?.message}>
            <Input type="date" {...register('deliveryDate')} />
          </FormField>
        </div>
        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea placeholder="Delivery instructions…" {...register('notes')} />
        </FormField>
      </FormSection>

      <FormSection title="Delivery address" description="Leave blank to use the customer's default address">
        <FormField label="Street">
          <Input placeholder="Street / landmark" {...register('address.street')} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="City">
            <Input placeholder="City" {...register('address.city')} />
          </FormField>
          <FormField label="State">
            <Input placeholder="State" {...register('address.state')} />
          </FormField>
          <FormField label="Pincode">
            <Input placeholder="Pincode" {...register('address.pincode')} />
          </FormField>
        </div>
      </FormSection>

      <Button type="submit" loading={submitting} className="min-h-11 w-full sm:w-auto">
        Save order · {formatCurrency(total)}
      </Button>
    </form>
  );
}
