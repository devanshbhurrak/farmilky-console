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
      customPrice: defaultValues?.customPrice ?? defaultValues?.pricePerUnit ?? undefined,
      startDate: defaultValues?.startDate ? defaultValues.startDate.slice(0, 10) : todayLocal(),
      deliverySchedule: defaultValues?.deliverySchedule ?? 'daily',
      customDays: defaultValues?.customDays ?? [],
      deliverySlot: initialSlots.slots[0],
      slots: initialSlots.slots,
      slotQuantities: initialSlots.slotQuantities,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const customerId = watch('userId');
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
    if (slot === selectedSlots[0] && qty !== undefined && qty >= 0.001) {
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
          quantityPerDelivery: total >= 0.001 ? total : v.quantityPerDelivery,
          deliverySlot: slots[0] ?? v.deliverySlot,
          slots,
          slotQuantities: slotQtyMap,
        });
      })}
      id="subscription-form"
      className="form-stack flex flex-col gap-4 text-slate-800"
    >
      {!fixedCustomerId && (
        <FormField label="Customer" required error={errors.userId?.message}>
          {customersQuery.isLoading ? (
            <p className="text-xs text-slate-500">Loading customers…</p>
          ) : (
            <SearchableSelect
              options={customers.map((c) => {
                const name = getName(c);
                return { id: getId(c), label: c.phone ? `${name} · ${c.phone}` : name };
              })}
              value={customerId}
              onChange={(id) => setValue('userId', id, { shouldValidate: true })}
              placeholder="Search customer by name or phone…"
              onSearch={setCustomerSearch}
            />
          )}
        </FormField>
      )}

      <FormField label="Product" required error={errors.productId?.message}>
        <Select aria-label="Product" value={productId} onChange={(e) => handleProductChange(e.target.value)}>
          <option value="">{productsQuery.isLoading ? 'Loading products…' : 'Select product'}</option>
          {products.map((p) => (
            <option key={getId(p)} value={getId(p)}>
              {getName(p)} · {formatCurrency(p.basePrice ?? p.price ?? 0)}
            </option>
          ))}
        </Select>
      </FormField>

      {variants.length > 0 && (
        <FormField label="Variant">
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
        </FormField>
      )}

      {/* Slots selection */}
      <div className="flex flex-col gap-1.5">
        <label className="block text-xs font-semibold text-slate-700">Delivery Slots</label>
        <div className="grid grid-cols-2 gap-2">
          {SLOT_OPTIONS.map((slot) => {
            const active = selectedSlots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                aria-pressed={active}
              >
                {slotLabel(slot)} Slot
              </button>
            );
          })}
        </div>
        {errors.slots?.message && (
          <p className="text-xs text-red-600">{errors.slots.message}</p>
        )}
      </div>

      {/* Quantities per slot or single slot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selectedSlots.length > 1 ? (
          <>
            {selectedSlots.map((slot) => (
              <FormField
                key={slot}
                label={`${slotLabel(slot)} Qty / Delivery`}
                required
                error={errors.slotQuantities?.[slot]?.message}
              >
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
          <FormField label="Qty / Delivery" required error={errors.quantityPerDelivery?.message}>
            <Input type="number" min={0.001} step={0.001} {...register('quantityPerDelivery')} />
          </FormField>
        )}

        <FormField label="Price per Unit" error={errors.customPrice?.message}>
          <div className="flex items-center gap-2">
            <Input type="number" min={0.01} step={0.01} {...register('customPrice')} />
            {isCustomPrice && (
              <span className="shrink-0 text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded">
                CUSTOM
              </span>
            )}
          </div>
          {selectedProduct && (
            <p className="mt-1 text-[11px] text-slate-500">
              Standard: {formatCurrency(defaultPrice)}{unitHint ? `/${unitHint}` : ''}
              {isCustomPrice ? ' (custom price will override)' : ''}
            </p>
          )}
        </FormField>
      </div>

      {/* Summary KPI Banner */}
      {selectedProduct && totalQtyPerDelivery > 0 && deliveryTotal > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-primary-900 uppercase tracking-wider text-[11px]">Daily Cost:</span>
          <strong className="text-sm font-extrabold text-primary-900">
            {formatCurrency(deliveryTotal)} / day
          </strong>
        </div>
      )}

      <FormField label="Start Date" required error={errors.startDate?.message}>
        <Input type="date" {...register('startDate')} />
      </FormField>

      <FormField label="Delivery Schedule" required error={errors.deliverySchedule?.message}>
        <Select {...register('deliverySchedule')}>
          <option value="daily">Daily</option>
          <option value="alternate">Alternate Days</option>
          <option value="weekly">Weekly</option>
          <option value="custom">Custom Days</option>
        </Select>
      </FormField>

      {schedule === 'custom' && (
        <FormField label="Custom Days" required error={errors.customDays?.message}>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {WEEK_DAYS.map((day) => {
              const active = customDays.includes(day);
              return (
                <label
                  key={day}
                  className={`flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                    active ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-sm' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Checkbox checked={active} onChange={() => toggleDay(day)} />
                  <span>{day.slice(0, 3)}</span>
                </label>
              );
            })}
          </div>
        </FormField>
      )}

      <div className="pt-2">
        <Button type="submit" loading={submitting} className="min-h-11 w-full text-sm font-bold">
          Save Subscription
        </Button>
      </div>
    </form>
  );
}
