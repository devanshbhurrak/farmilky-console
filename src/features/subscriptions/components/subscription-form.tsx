import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/form/form-field';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, getId, getName, normalizeList } from '@/lib/utils';
import { WEEK_DAYS } from '@/types/subscription';
import { subscriptionsApi } from '../api';
import { subscriptionSchema } from '../schemas';
import type { SubscriptionInput } from '../schemas';

interface LiteVariant {
  id?: string;
  _id?: string;
  label: string;
  price: number;
  discountedPrice?: number | null;
  unit?: string;
  isDefault?: boolean;
}

interface LiteProduct {
  id: string;
  name: string;
  basePrice?: number | null;
  price?: number;
  unit?: string;
  variants?: LiteVariant[];
}

interface LiteCustomer {
  id: string;
  name: string;
  phone?: string;
}

function variantIdOf(v: LiteVariant, index: number): string {
  return v.id ?? v._id ?? `variant-${index}`;
}

function variantPrice(v: LiteVariant): number {
  return v.discountedPrice ?? v.price;
}

export function SubscriptionForm({
  defaultValues,
  onSubmit,
  submitting,
  fixedCustomerId,
}: {
  defaultValues?: Partial<SubscriptionInput> & {
    quantityPerDay?: number;
    pricePerUnit?: number;
    slot?: 'morning' | 'evening';
  };
  onSubmit: (values: SubscriptionInput) => void;
  submitting?: boolean;
  fixedCustomerId?: string;
}) {
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch, 400);

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ lite: true }),
    queryFn: async () => {
      const res = await subscriptionsApi.productsLite();
      return normalizeList<LiteProduct>(res, ['products']).items;
    },
    placeholderData: keepPreviousData,
  });

  const customersQuery = useQuery({
    queryKey: queryKeys.customers.list({ search: debouncedCustomerSearch, role: 'customer' }),
    queryFn: async () => {
      const res = await subscriptionsApi.customersLite(debouncedCustomerSearch);
      return normalizeList<LiteCustomer>(res, ['users', 'customers']).items;
    },
    placeholderData: keepPreviousData,
  });

  const form = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema) as unknown as Resolver<SubscriptionInput>,
    defaultValues: {
      userId: defaultValues?.userId ?? fixedCustomerId ?? '',
      productId: defaultValues?.productId ?? '',
      variantId: defaultValues?.variantId ?? undefined,
      quantityPerDelivery:
        defaultValues?.quantityPerDelivery ?? defaultValues?.quantityPerDay ?? 1,
      customPrice:
        defaultValues?.customPrice ?? defaultValues?.pricePerUnit ?? 0,
      startDate: defaultValues?.startDate ?? '',
      deliverySchedule: defaultValues?.deliverySchedule ?? 'daily',
      customDays: defaultValues?.customDays ?? [],
      deliverySlot:
        defaultValues?.deliverySlot ?? defaultValues?.slot ?? 'morning',
    },
  });

  const { register, handleSubmit, watch, setValue, formState } = form;
  const { errors } = formState;

  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const productId = watch('productId');
  const variantId = watch('variantId');
  const quantityPerDelivery = watch('quantityPerDelivery');
  const customPrice = watch('customPrice');
  const schedule = watch('deliverySchedule');
  const customDays = watch('customDays') ?? [];

  const selectedProduct = products.find((p) => getId(p) === productId);
  const variants = selectedProduct?.variants ?? [];
  const defaultVariantIndex = Math.max(
    variants.findIndex((v) => v.isDefault),
    0,
  );
  const defaultVariant = variants[defaultVariantIndex];
  const defaultPrice = defaultVariant
    ? variantPrice(defaultVariant)
    : Number(selectedProduct?.basePrice ?? selectedProduct?.price ?? 0);
  const unitHint = defaultVariant?.unit ?? selectedProduct?.unit;
  const isCustomPrice = Number(customPrice) > 0 && Number(customPrice) !== Number(defaultPrice);
  const deliveryTotal =
    Number(quantityPerDelivery || 0) * Number(customPrice || defaultPrice || 0);

  const handleProductChange = (nextProductId: string) => {
    setValue('productId', nextProductId, { shouldValidate: true });
    const next = products.find((p) => getId(p) === nextProductId);
    const nextVariants = next?.variants ?? [];
    const idx = Math.max(
      nextVariants.findIndex((v) => v.isDefault),
      0,
    );
    const dv = nextVariants[idx];
    if (dv) {
      setValue('variantId', variantIdOf(dv, idx));
      setValue('customPrice', variantPrice(dv), { shouldValidate: true });
    } else if (next) {
      setValue('variantId', undefined as unknown as string);
      setValue('customPrice', Number(next.basePrice ?? next.price ?? 0), { shouldValidate: true });
    }
  };

  const toggleDay = (day: string) => {
    const next = customDays.includes(day) ? customDays.filter((d) => d !== day) : [...customDays, day];
    setValue('customDays', next, { shouldValidate: true });
  };

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const v = values as unknown as SubscriptionInput;
        onSubmit({ ...v, userId: fixedCustomerId ?? v.userId });
      })}
      className="flex flex-col gap-4"
    >
      {!fixedCustomerId && (
        <FormField label="Customer" required error={errors.userId?.message}>
          <SearchableSelect
            options={customers.map((c) => {
              const name = getName(c);
              return {
                id: getId(c),
                label: c.phone ? `${name} · ${c.phone}` : name,
              };
            })}
            value={watch('userId')}
            onChange={(id) => setValue('userId', id, { shouldValidate: true })}
            placeholder="Search customer by name or phone…"
            onSearch={setCustomerSearch}
          />
        </FormField>
      )}

      <FormField label="Product" required error={errors.productId?.message} hint={unitHint ? `Unit: ${unitHint}` : undefined}>
        <Select aria-label="Product" value={productId} onChange={(e) => handleProductChange(e.target.value)}>
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={getId(p)} value={getId(p)}>
              {getName(p)} · {formatCurrency(p.basePrice ?? p.price ?? 0)}
            </option>
          ))}
        </Select>
      </FormField>

      {variants.length > 0 && (
        <FormField label="Variant">
          <div className="flex flex-wrap gap-2">
            {variants.map((v, i) => {
              const vid = variantIdOf(v, i);
              const active = (variantId ?? '') === vid;
              return (
                <button
                  key={vid}
                  type="button"
                  onClick={() => {
                    setValue('variantId', vid);
                    setValue('customPrice', variantPrice(v), { shouldValidate: true });
                  }}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary-600 bg-primary-50 text-primary-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={active}
                >
                  {v.label} · {formatCurrency(variantPrice(v))}
                </button>
              );
            })}
          </div>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Qty / delivery" required error={errors.quantityPerDelivery?.message}>
          <Input type="number" min={1} step="any" {...register('quantityPerDelivery')} />
        </FormField>
        <FormField
          label="Price / unit"
          error={errors.customPrice?.message}
          hint={selectedProduct ? `Default ${formatCurrency(defaultPrice)}` : undefined}
        >
          <div className="flex items-center gap-2">
            <Input type="number" min={0} step="any" {...register('customPrice')} />
            {selectedProduct && isCustomPrice && <Badge variant="warning">CUSTOM</Badge>}
          </div>
        </FormField>
      </div>

      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Delivery total: <span className="font-semibold text-slate-900">{formatCurrency(deliveryTotal)}</span>
      </div>

      <FormField label="Start date" required error={errors.startDate?.message}>
        <Input type="date" {...register('startDate')} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Schedule" required error={errors.deliverySchedule?.message}>
          <Select {...register('deliverySchedule')}>
            <option value="daily">Daily</option>
            <option value="alternate">Alternate</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </Select>
        </FormField>
        <FormField label="Slot" error={errors.deliverySlot?.message}>
          <Select {...register('deliverySlot')}>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </Select>
        </FormField>
      </div>

      {schedule === 'custom' && (
        <FormField label="Custom days" hint="Select delivery days">
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => (
              <label
                key={day}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <Checkbox checked={customDays.includes(day)} onChange={() => toggleDay(day)} />
                {day}
              </label>
            ))}
          </div>
        </FormField>
      )}

      <Button type="submit" loading={submitting} className="min-h-11">
        Save subscription
      </Button>
    </form>
  );
}
