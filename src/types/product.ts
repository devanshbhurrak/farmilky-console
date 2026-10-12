export interface ProductVariant {
  id?: string;
  _id?: string;
  label: string;
  quantity?: number;
  unit?: string;
  price: number;
  discountedPrice?: number | null;
  stock?: number;
  isDefault?: boolean;
  isAvailable?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  price: number;
  stock?: number | null;
  fatContent?: string | null;
  image?: string | null;
  isAvailable: boolean;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  availability?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const PRODUCT_CATEGORIES = ['milk', 'ghee', 'paneer', 'curd', 'butter', 'cheese', 'other'] as const;
export const PRODUCT_UNITS = ['L', 'ml', 'kg', 'g', 'unit'] as const;

export function variantKey(v: ProductVariant, index: number): string {
  return v.id ?? v._id ?? `variant-${index}`;
}

export function effectivePrice(v: ProductVariant): number {
  return v.discountedPrice ?? v.price;
}
