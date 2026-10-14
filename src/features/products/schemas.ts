import { z } from 'zod';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/types/product';

/** Coerce HTML form values: empty string / null behave as "not provided". */
function emptyToUndefined(value: unknown): unknown {
  return value === '' || value === null ? undefined : value;
}

export const productVariantSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  quantity: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive('Quantity must be positive').optional(),
  ),
  unit: z.string().trim().optional().default(''),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  discountedPrice: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0, 'Discounted price cannot be negative').optional().nullable(),
  ),
  stock: z.coerce.number().min(0, 'Stock cannot be negative').default(100),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

const imageSchema = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine(
    (v) =>
      v === '' ||
      v === undefined ||
      /^(https?:\/\/.+|data:.+|\/.+)$/.test(v),
    { message: 'Must be a valid URL' },
  );

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional().default(''),
  category: z.enum(PRODUCT_CATEGORIES),
  unit: z.enum(PRODUCT_UNITS),
  basePrice: z.coerce.number().min(0, 'Price cannot be negative'),
  stock: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0, 'Stock cannot be negative').optional(),
  ),
  fatContent: z.string().trim().optional().default(''),
  imageUrl: imageSchema,
  variants: z.array(productVariantSchema).default([]),
  isAvailable: z.boolean().default(true),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductInput = z.infer<typeof productSchema>;
