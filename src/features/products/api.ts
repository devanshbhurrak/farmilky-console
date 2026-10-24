import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { Product, ProductListParams } from '@/types/product';
import type { ProductInput } from './schemas';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface UploadImageResponse {
  url: string;
  key: string;
}

export const productsApi = {
  list: (params?: ProductListParams) =>
    api.get<PaginatedResponse<Product> | ApiResponse<Product[]>>(
      '/api/products',
      (params ?? {}) as QueryParams,
    ),
  get: (id: string) => api.get<ApiResponse<Product>>(`/api/products/${id}`),
  create: (data: ProductInput) => api.post<ApiResponse<Product>>('/api/products', data),
  update: (id: string, data: ProductInput) =>
    api.put<ApiResponse<Product>>(`/api/products/${id}`, data),
  remove: (id: string) => api.delete<ApiResponse<unknown>>(`/api/products/${id}`),
  uploadImage: (formData: FormData) =>
    api.post<UploadImageResponse>('/api/upload/image', formData),
};
