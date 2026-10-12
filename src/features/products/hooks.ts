import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { productsApi } from './api';
import type { ProductInput } from './schemas';
import type { Product, ProductListParams } from '@/types/product';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => normalizeList<Product>(await productsApi.list(params)),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.products.all(), 'detail', id ?? ''],
    queryFn: async () => unwrapData<Product>(await productsApi.get(id ?? '')),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) => productsApi.create(data),
    onSuccess: () => {
      toast.success('Product created');
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductInput }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      toast.success('Product updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast.success('Product deleted');
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
