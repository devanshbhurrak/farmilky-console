import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatNumber, getId, getName, normalizeList } from '@/lib/utils';
import { effectivePrice, variantKey } from '@/types/product';
import type { Product, ProductVariant } from '@/types/product';
import { deliveriesApi } from '../api';

export interface AddedExtraItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  slot: 'morning' | 'evening';
}

interface VariantOption {
  variant: ProductVariant;
  key: string;
}

function getVariantOptions(product: Product | undefined): VariantOption[] {
  if (!product?.variants) return [];
  return product.variants
    .map((variant, index) => ({ variant, key: variantKey(variant, index) }))
    .filter(({ variant }) => variant.isAvailable !== false && Boolean(variant.id || variant._id));
}

export function DeliveryItemAdder({
  customerName,
  slots,
  defaultSlot,
  onAdd,
}: {
  customerName: string;
  slots: Array<'morning' | 'evening'>;
  defaultSlot: 'morning' | 'evening';
  onAdd: (item: AddedExtraItem) => void;
}) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [slot, setSlot] = useState<'morning' | 'evening'>(defaultSlot);
  const [error, setError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ lite: true }),
    queryFn: async () => {
      const res = await deliveriesApi.productsLite();
      return normalizeList<Product>(res, ['products']).items;
    },
    placeholderData: keepPreviousData,
    enabled: isAdmin && open,
  });

  if (!isAdmin) return null;

  const products = (productsQuery.data ?? []).filter((product) => product.isAvailable !== false);
  const selected = products.find((p) => getId(p) === productId);
  const hasVariants = (selected?.variants?.length ?? 0) > 0;
  const variantOptions = getVariantOptions(selected);
  const selectedVariant = variantOptions.find((option) => option.key === variantId)?.variant;
  const selectedUnit = selectedVariant?.unit ?? selected?.unit ?? null;
  const hasNoAvailableVariants = hasVariants && variantOptions.length === 0;
  const qtyNum = Number(quantity);
  const priceNum = Number(price);
  const roundedPrice = Number.isFinite(priceNum) && priceNum >= 0
    ? Math.round((priceNum + Number.EPSILON) * 100) / 100
    : 0;
  const lineTotal =
    Math.round(
      ((Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0) * roundedPrice + Number.EPSILON) * 100,
    ) / 100;

  const handleProductChange = (id: string) => {
    setProductId(id);
    setError(null);
    const product = products.find((p) => getId(p) === id);
    const options = getVariantOptions(product);
    const defaultVariant = options.find(({ variant }) => variant.isDefault) ?? options[0];
    setVariantId(defaultVariant?.key ?? '');
    const basePrice = defaultVariant
      ? effectivePrice(defaultVariant.variant)
      : product?.basePrice ?? product?.price;
    setPrice(basePrice != null ? String(basePrice) : '');
  };

  const handleVariantChange = (key: string) => {
    setVariantId(key);
    setError(null);
    const option = variantOptions.find((item) => item.key === key);
    if (option) setPrice(String(effectivePrice(option.variant)));
  };

  const handleQtyStep = (delta: number) => {
    const next = Math.max(1, (Number.isFinite(qtyNum) ? qtyNum : 1) + delta);
    setQuantity(String(next));
  };

  const handleSubmit = () => {
    if (!productId || !selected) {
      setError('Select a product');
      return;
    }
    if (hasNoAvailableVariants) {
      setError('No variants available for this product');
      return;
    }
    if (hasVariants && !selectedVariant) {
      setError('Select a variant');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError('Enter a valid quantity');
      return;
    }
    if (!Number.isInteger(qtyNum)) {
      setError('Quantity must be a whole number');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('Enter a valid price');
      return;
    }

    onAdd({
      productId,
      variantId: variantId || undefined,
      productName: getName(selected),
      variantLabel: selectedVariant?.label,
      unit: selectedUnit,
      quantity: qtyNum,
      unitPrice: roundedPrice,
      slot,
    });

    setProductId('');
    setVariantId('');
    setQuantity('1');
    setPrice('');
    setError(null);
  };

  return (
    <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 p-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
          <PlusCircle className="size-3.5" aria-hidden="true" />
          Add item to this delivery
        </span>
        <span className="text-[10px] font-medium text-emerald-700">{open ? 'Hide' : 'Extra product'}</span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2">
          <p className="text-[10px] text-emerald-800">
            Adds to <span className="font-semibold">{customerName}</span>&apos;s items below; confirm the delivery to save it.
          </p>

          <div>
            <label className="mb-0.5 block text-[10px] font-semibold text-emerald-900">Product</label>
            <Select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="h-8 min-h-8 rounded-md py-0 text-xs"
            >
              <option value="">Select product</option>
              {products.map((p) => {
                const options = getVariantOptions(p);
                const defaultVariant = options.find(({ variant }) => variant.isDefault) ?? options[0];
                const base = defaultVariant ? effectivePrice(defaultVariant.variant) : p.basePrice ?? p.price;
                return (
                  <option key={getId(p)} value={getId(p)}>
                    {getName(p)}
                    {base != null ? ` · ${formatCurrency(base)}` : ''}
                  </option>
                );
              })}
            </Select>
            {productsQuery.isError && (
              <p className="mt-1 text-[10px] text-rose-600">Could not load products.</p>
            )}
          </div>

          {variantOptions.length > 1 && (
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold text-emerald-900">Variant</label>
              <Select
                value={variantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="h-8 min-h-8 rounded-md py-0 text-xs"
              >
                {variantOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.variant.label} · {formatCurrency(effectivePrice(option.variant))}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold text-emerald-900">Quantity</label>
              <div className="flex h-8 items-center overflow-hidden rounded-md border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => handleQtyStep(-1)}
                  disabled={(Number.isFinite(qtyNum) ? qtyNum : 1) <= 1}
                  className="h-full w-7 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setError(null);
                  }}
                  className="h-8 flex-1 rounded-none border-0 border-x border-slate-200 px-0 text-center text-xs font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => handleQtyStep(1)}
                  className="h-full w-7 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="mb-0.5 block text-[10px] font-semibold text-emerald-900">Price (₹)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setError(null);
                }}
                placeholder="Unit price"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {slots.length > 1 && (
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold text-emerald-900">Delivery slot</label>
              <Select
                value={slot}
                onChange={(e) => setSlot(e.target.value as 'morning' | 'evening')}
                className="h-8 min-h-8 rounded-md py-0 text-xs"
              >
                {slots.map((value) => (
                  <option key={value} value={value}>
                    {value === 'morning' ? 'Morning' : 'Evening'}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] text-emerald-700">
              {selectedUnit ? `Unit: ${selectedUnit}` : '\u00A0'}
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-medium uppercase tracking-tight text-emerald-700">Line total</span>
              <span className="font-mono text-sm font-extrabold tabular-nums text-emerald-950">
                ₹{formatNumber(lineTotal)}
              </span>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            className="h-8 w-full text-[11px] font-semibold"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add to delivery list
          </Button>

          {error && <p className="text-[10px] text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
