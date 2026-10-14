import { Controller, useFieldArray, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormSection } from '@/components/form/form-field';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/types/product';
import { titleCase } from '@/lib/utils';
import { productSchema, type ProductInput } from '../schemas';

interface ProductFormProps {
  defaultValues?: Partial<ProductInput>;
  onSubmit: (data: ProductInput) => void | Promise<void>;
  submitting?: boolean;
}

const EMPTY_DEFAULTS: ProductInput = {
  name: '',
  description: '',
  category: 'milk',
  unit: 'L',
  basePrice: 0,
  stock: undefined,
  fatContent: '',
  imageUrl: '',
  variants: [],
  isAvailable: true,
};

export function ProductForm({ defaultValues, onSubmit, submitting }: ProductFormProps) {
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as unknown as Resolver<ProductInput>,
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues, variants: defaultValues?.variants ?? [] },
  });
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  const setDefaultVariant = (index: number) => {
    const current = getValues('variants');
    current.forEach((_, i) => {
      setValue(`variants.${i}.isDefault` as const, i === index, { shouldDirty: true });
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormSection title="Basic info">
        <FormField label="Name" required error={errors.name?.message}>
          <Input placeholder="A2 Desi Cow Milk" {...register('name')} />
        </FormField>
        <FormField label="Description" error={errors.description?.message}>
          <Textarea placeholder="Short description…" {...register('description')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category" required error={errors.category?.message}>
            <Select {...register('category')}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Unit" required error={errors.unit?.message}>
            <Select {...register('unit')}>
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Image URL" hint="Leave blank for no image" error={errors.imageUrl?.message}>
          <Input placeholder="https://…" inputMode="url" {...register('imageUrl')} />
        </FormField>
      </FormSection>

      <FormSection title="Pricing & stock">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Price" required error={errors.basePrice?.message}>
            <Input type="number" min={0} step="any" placeholder="0" {...register('basePrice')} />
          </FormField>
          <FormField label="Stock" error={errors.stock?.message}>
            <Input type="number" min={0} step="1" placeholder="Optional" {...register('stock')} />
          </FormField>
        </div>
        <FormField label="Fat content" error={errors.fatContent?.message}>
          <Input placeholder="e.g. 4.5% (optional)" {...register('fatContent')} />
        </FormField>
        <Controller
          control={control}
          name="isAvailable"
          render={({ field }) => (
            <FormField label="Available for sale">
              <div className="flex min-h-11 items-center gap-2">
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  aria-label="Available for sale"
                />
                <span className="text-sm text-slate-600">{field.value ? 'Yes' : 'No'}</span>
              </div>
            </FormField>
          )}
        />
      </FormSection>

      <FormSection
        title="Variants"
        description="Different pack sizes or options. Tick one as the default."
      >
        <div className="flex flex-col gap-3">
          {fields.map((field, i) => (
            <div key={field.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">Variant {i + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  aria-label={`Remove variant ${i + 1}`}
                >
                  <Trash2 />
                  Remove
                </Button>
              </div>
              <FormField label="Label" required error={errors.variants?.[i]?.label?.message}>
                <Input placeholder="e.g. 500 ml pack" {...register(`variants.${i}.label` as const)} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Price" required error={errors.variants?.[i]?.price?.message}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    {...register(`variants.${i}.price` as const)}
                  />
                </FormField>
                <FormField
                  label="Discounted price"
                  error={errors.variants?.[i]?.discountedPrice?.message}
                >
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Optional"
                    {...register(`variants.${i}.discountedPrice` as const)}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Quantity" error={errors.variants?.[i]?.quantity?.message}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Optional"
                    {...register(`variants.${i}.quantity` as const)}
                  />
                </FormField>
                <FormField label="Stock" error={errors.variants?.[i]?.stock?.message}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="100"
                    {...register(`variants.${i}.stock` as const)}
                  />
                </FormField>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Controller
                  control={control}
                  name={`variants.${i}.isDefault` as const}
                  render={({ field: f }) => (
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={f.value}
                        onChange={() => setDefaultVariant(i)}
                        aria-label={`Mark variant ${i + 1} as default`}
                      />
                      Default
                    </label>
                  )}
                />
                <Controller
                  control={control}
                  name={`variants.${i}.isAvailable` as const}
                  render={({ field: f }) => (
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={f.value}
                        onChange={(e) => f.onChange(e.target.checked)}
                        aria-label={`Variant ${i + 1} available`}
                      />
                      Available
                    </label>
                  )}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                label: '',
                quantity: undefined,
                unit: '',
                price: 0,
                discountedPrice: undefined,
                stock: 100,
                isDefault: fields.length === 0,
                isAvailable: true,
              })
            }
          >
            <Plus />
            Add variant
          </Button>
        </div>
      </FormSection>

      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Save product
      </Button>
    </form>
  );
}
