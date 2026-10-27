import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { Product, ProductListParams } from '@/types/product';
import type { ProductInput } from './schemas';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface UploadImageResponse {
  url: string;
  key: string;
}

// Default tenant slug used for unauthenticated "public" requests.
// Authenticated requests fall back to the JWT tenant context server-side.
const DEFAULT_TENANT_SLUG: string | undefined = import.meta.env.VITE_TENANT_SLUG;

/** Merges caller params with the default tenant slug so that public
 *  (unauthenticated) product requests still resolve the tenant on the backend.
 *  Authenticated requests fall through to the JWT-derived tenant server-side. */
function withTenant(params?: ProductListParams): QueryParams {
  const base: QueryParams = { ...(params ?? {}) };
  if (!base.slug) {
    base.slug = DEFAULT_TENANT_SLUG;
  }
  return base;
}

export const productsApi = {
  list: (params?: ProductListParams) =>
    api.get<PaginatedResponse<Product> | ApiResponse<Product[]>>(
      '/api/products',
      withTenant(params),
    ),
  get: (id: string, params?: { slug?: string }) =>
    api.get<ApiResponse<Product>>(`/api/products/${id}`, withTenant(params)),
  create: (data: ProductInput) => api.post<ApiResponse<Product>>('/api/products', data),
  update: (id: string, data: ProductInput) =>
    api.put<ApiResponse<Product>>(`/api/products/${id}`, data),
  remove: (id: string) => api.delete<ApiResponse<unknown>>(`/api/products/${id}`),
  uploadImage: (formData: FormData) =>
    api.post<ApiResponse<UploadImageResponse>>('/api/upload/image', formData),
};
