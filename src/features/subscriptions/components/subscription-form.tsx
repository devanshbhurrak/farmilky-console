import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/form/form-field';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, getId, getName, normalizeList, todayLocal } from '@/lib/utils';
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

const SLOT_OPTIONS = ['morning', 'evening'] as const;
type SlotOption = (typeof SLOT_OPTIONS)[number];

function slotLabel(slot: SlotOption): string {
  return slot === 'morning' ? 'Morning' : 'Evening';
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
    slotRows?: Array<{ deliverySlot?: string; quantityPerDelivery?: string | number }>;
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
    enabled: !fixedCustomerId,
    placeholderData: keepPreviousData,
  });

  const initialSlots = (() => {
    const rows = defaultValues?.slotRows ?? [];
    if (rows.length > 0) {
      const entries = rows.map((r) => ({
        slot: (r.deliverySlot === 'evening' ? 'evening' : 'morning') as SlotOption,
        quantityPerDelivery: Number(r.quantityPerDelivery ?? 1) || 1,
      }));
      return {
        slots: entries.map((e) => e.slot),
        slotQuantities: {
          morning: entries.find((e) => e.slot === 'morning')?.quantityPerDelivery,
          evening: entries.find((e) => e.slot === 'evening')?.quantityPerDelivery,
        },
        primaryQty: entries.reduce((sum, e) => sum + e.quantityPerDelivery, 0),
      };
    }
    const single = (defaultValues?.deliverySlot ?? defaultValues?.slot ?? 'morning') as SlotOption;
    const qty = defaultValues?.quantityPerDelivery ?? defaultValues?.quantityPerDay ?? 1;
    return {
      slots: [single],
      slotQuantities: {
        morning: single === 'morning' ? qty : undefined,
        evening: single === 'evening' ? qty : undefined,
      },
      primaryQty: qty,
    };
  })();

  const form = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema) as unknown as Resolver<SubscriptionInput>,
    defaultValues: {
      userId: defaultValues?.userId ?? fixedCustomerId ?? '',
      productId: defaultValues?.productId ?? '',
      variantId: defaultValues?.variantId ?? undefined,
      quantityPerDelivery: initialSlots.primaryQty,
      customPrice: defaultValues?.customPrice ?? defaultValues?.pricePerUnit ?? 0,
      startDate: defaultValues?.startDate ?? todayLocal(),
      deliverySchedule: defaultValues?.deliverySchedule ?? 'daily',
      customDays: defaultValues?.customDays ?? [],
      deliverySlot: initialSlots.slots[0],
      slots: initialSlots.slots,
      slotQuantities: initialSlots.slotQuantities,
    },
  });

  const { register, handleSubmit, watch, setValue } = form;

  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const productId = watch('productId');
  const variantId = watch('variantId');
  const quantityPerDelivery = watch('quantityPerDelivery');
  const customPrice = watch('customPrice');
  const schedule = watch('deliverySchedule');
  const customDays = watch('customDays') ?? [];
  const selectedSlots = (watch('slots') ?? []) as SlotOption[];
  const slotQuantities = (watch('slotQuantities') ?? {}) as Partial<Record<SlotOption, number>>;

  const selectedProduct = products.find((p) => getId(p) === productId);
  const variants = selectedProduct?.variants ?? [];
  const defaultVariantIndex = Math.max(variants.findIndex((v) => v.isDefault), 0);
  const defaultVariant = variants[defaultVariantIndex];
  const defaultPrice = defaultVariant ? variantPrice(defaultVariant) : Number(selectedProduct?.basePrice ?? selectedProduct?.price ?? 0);
  const unitHint = defaultVariant?.unit ?? selectedProduct?.unit;
  const isCustomPrice = Number(customPrice) > 0 && Number(customPrice) !== Number(defaultPrice);
  const totalQtyPerDelivery =
    selectedSlots.length > 1
      ? selectedSlots.reduce((sum, slot) => sum + (Number(slotQuantities[slot] ?? quantityPerDelivery) || 0), 0)
      : Number(quantityPerDelivery || 0);
  const deliveryTotal = totalQtyPerDelivery * Number(customPrice || defaultPrice || 0);

  const handleProductChange = (nextProductId: string) => {
    setValue('productId', nextProductId, { shouldValidate: true });
    const next = products.find((p) => getId(p) === nextProductId);
    const nextVariants = next?.variants ?? [];
    const idx = Math.max(nextVariants.findIndex((v) => v.isDefault), 0);
    const dv = nextVariants[idx];
    if (dv) {
      setValue('variantId', variantIdOf(dv, idx));
      setValue('customPrice', variantPrice(dv), { shouldValidate: true });
    } else if (next) {
      setValue('variantId', undefined);
      setValue('customPrice', Number(next.basePrice ?? next.price ?? 0), { shouldValidate: true });
    }
  };

  const toggleDay = (day: string) => {
    const next = customDays.includes(day) ? customDays.filter((d) => d !== day) : [...customDays, day];
    setValue('customDays', next, { shouldValidate: true });
  };

  const toggleSlot = (slot: SlotOption) => {
    const isSelected = selectedSlots.includes(slot);
    const next = isSelected ? selectedSlots.filter((s) => s !== slot) : [...selectedSlots, slot];
    if (next.length === 0) return;
    setValue('slots', next, { shouldValidate: true });
    setValue('deliverySlot', next[0], { shouldValidate: true });
    if (!isSelected && slotQuantities[slot] === undefined) {
      setValue('slotQuantities', { ...slotQuantities, [slot]: Number(quantityPerDelivery) || 1 }, { shouldValidate: true });
    }
  };

  const setSlotQuantity = (slot: SlotOption, value: string) => {
    const qty = value === '' ? undefined : Number(value);
    setValue('slotQuantities', { ...slotQuantities, [slot]: qty }, { shouldValidate: true });
    if (slot === selectedSlots[0] && qty !== undefined && qty >= 1) {
      setValue('quantityPerDelivery', qty, { shouldValidate: true });
    }
  };

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const v = values as unknown as SubscriptionInput;
        const slots = (v.slots ?? []).filter((s): s is SlotOption => SLOT_OPTIONS.includes(s as SlotOption));
        const slotQtyMap = v.slotQuantities ?? {};
        const deliverySlots = slots.map((slot) => ({
          slot,
          quantityPerDelivery: slots.length > 1 ? Number(slotQtyMap[slot] ?? v.quantityPerDelivery) || 1 : Number(slotQtyMap[slot] ?? v.quantityPerDelivery) || v.quantityPerDelivery,
        }));
        const total = deliverySlots.reduce((sum, s) => sum + (s.quantityPerDelivery ?? 0), 0);
        onSubmit({
          ...v,
          userId: fixedCustomerId ?? v.userId,
          quantityPerDelivery: total >= 1 ? total : v.quantityPerDelivery,
          deliverySlot: slots[0] ?? v.deliverySlot,
          slots,
          slotQuantities: slotQtyMap,
        });
      })}
      id="subscription-form"
      className="form-stack flex flex-col gap-4"
    >
      {!fixedCustomerId && (
        <div className="form-group">
          <label className="block text-xs font-medium text-slate-700">Customer</label>
          {customersQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading customers…</p>
          ) : (
            <SearchableSelect
              options={customers.map((c) => {
                const name = getName(c);
                return { id: getId(c), label: c.phone ? `${name} · ${c.phone}` : name };
              })}
              value={watch('userId')}
              onChange={(id) => setValue('userId', id, { shouldValidate: true })}
              placeholder="Search customer by name or phone…"
              onSearch={setCustomerSearch}
            />
          )}
        </div>
      )}

      <div className="form-group">
        <label className="block text-xs font-medium text-slate-700">Product</label>
        <Select aria-label="Product" value={productId} onChange={(e) => handleProductChange(e.target.value)}>
          <option value="">{productsQuery.isLoading ? 'Loading products…' : 'Select product'}</option>
          {products.map((p) => (
            <option key={getId(p)} value={getId(p)}>
              {getName(p)} · {formatCurrency(p.basePrice ?? p.price ?? 0)}
            </option>
          ))}
        </Select>
      </div>

      {variants.length > 0 && (
        <div className="form-group">
          <label className="block text-xs font-medium text-slate-700">Variant</label>
          <Select value={variantId ?? ''} onChange={(e) => {
            const vid = e.target.value || undefined;
            const variant = vid ? variants.find((v) => variantIdOf(v, variants.indexOf(v)) === vid) : null;
            setValue('variantId', vid, { shouldValidate: true });
            setValue('customPrice', variant ? variantPrice(variant) : Number(selectedProduct?.price ?? 0), { shouldValidate: true });
          }}>
            <option value="">Default variant</option>
            {variants.map((v, i) => {
              const vid = variantIdOf(v, i);
              return (
                <option key={vid} value={vid}>
                  {v.label} — {formatCurrency(variantPrice(v))}
                </option>
              );
            })}
          </Select>
        </div>
      )}

      <div className="form-row grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selectedSlots.length > 1 ? (
          <>
            {selectedSlots.map((slot) => (
              <FormField key={slot} label={`${slotLabel(slot)} qty / delivery`} required>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={slotQuantities[slot] ?? ''}
                  onChange={(e) => setSlotQuantity(slot, e.target.value)}
                />
              </FormField>
            ))}
          </>
        ) : (
          <div className="form-group">
            <label className="block text-xs font-medium text-slate-700">Qty / delivery</label>
            <Input type="number" min={0.001} step={0.001} {...register('quantityPerDelivery')} />
          </div>
        )}
        <div className="form-group">
          <label className="block text-xs font-medium text-slate-700 flex items-center gap-1">
            Price per Unit
            {isCustomPrice && <span className="price-custom-badge text-[10px] font-bold bg-warning-bg border-warning/20 text-warning px-1.5 py-0.5 rounded-full">CUSTOM</span>}
          </label>
          <div className="flex items-center gap-2">
            <Input type="number" min={0.01} step={0.01} {...register('customPrice')} />
            {selectedProduct && isCustomPrice && <span className="text-[10px] text-slate-500">Default {formatCurrency(defaultPrice)}</span>}
          </div>
          {selectedProduct && (
            <p className="mt-1 text-xs text-slate-500">
              {unitHint
                ? `Standard rate: ${formatCurrency(defaultPrice)}/${unitHint}`
                : `Standard rate: ${formatCurrency(defaultPrice)}`}
              {isCustomPrice && ' — custom rate will override'}
            </p>
          )}
        </div>
      </div>

      {selectedProduct && totalQtyPerDelivery > 0 && deliveryTotal > 0 && (
        <div className="sub-preview-banner rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="sub-preview-label text-slate-500">Daily total</span>
          <strong className="sub-preview-value text-slate-900 font-semibold">
            {`₹${deliveryTotal.toFixed(2)}/day`}
          </strong>
        </div>
      )}

      <div className="form-group">
        <label className="block text-xs font-medium text-slate-700">Start Date</label>
        <Input type="date" {...register('startDate')} />
      </div>

      <div className="form-group">
        <label className="block text-xs font-medium text-slate-700">Delivery Schedule</label>
        <Select {...register('deliverySchedule')}>
          <option value="daily">Daily</option>
          <option value="alternate">Alternate Days</option>
          <option value="weekly">Weekly</option>
          <option value="custom">Custom</option>
        </Select>
      </div>

      {schedule === 'custom' && (
        <div className="form-group">
          <label className="block text-xs font-medium text-slate-700">Custom Days</label>
          <div className="days-selector flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => (
              <label key={day} className="day-chip flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <Checkbox checked={customDays.includes(day)} onChange={() => toggleDay(day)} />
                <span>{day.slice(0, 3)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="block text-xs font-medium text-slate-700">Delivery Slots</label>
        <div className="flex gap-2">
          {SLOT_OPTIONS.map((slot) => {
            const active = selectedSlots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`} aria-pressed={active}
              >
                {slotLabel(slot)}
              </button>
            );
          })}
        </div>
      </div>

      <Button type="submit" loading={submitting} className="min-h-11 w-full">
        Save subscription
      </Button>
    </form>
  );
}
