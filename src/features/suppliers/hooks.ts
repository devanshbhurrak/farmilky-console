import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { suppliersApi } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import type { SupplierListParams } from '@/types/supplier';

export function useSuppliers(params: SupplierListParams) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(params as Record<string, unknown>),
    queryFn: () => suppliersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id ?? ''),
    queryFn: () => suppliersApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => suppliersApi.create(data),
    onSuccess: () => {
      toast.success('Supplier created');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => suppliersApi.update(id, data),
    onSuccess: (_data, variables) => {
      toast.success('Supplier updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      toast.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSetSupplierStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => suppliersApi.setStatus(id, isActive),
    onSuccess: (data, variables) => {
      // Handle warning from backend (e.g., when deactivating supplier with unsettled collections)
      if (data && typeof data === 'object' && 'warning' in data) {
        toast.warning((data as { warning: string }).warning);
      } else {
        toast.success(variables.isActive ? 'Supplier activated' : 'Supplier deactivated');
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSupplierPassbook(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.suppliers.detail(id ?? ''), 'passbook'],
    queryFn: () => suppliersApi.passbook(id as string),
    enabled: !!id,
  });
}

export function useCollectionTotal(supplierId: string | undefined, from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.suppliers.detail(supplierId ?? ''), 'collection-total', { from, to }],
    queryFn: () => suppliersApi.collectionTotal(supplierId as string, from, to),
    enabled: !!supplierId && enabled,
  });
}

export function useRecordSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof suppliersApi.recordSupplierPayment>[0]) =>
      suppliersApi.recordSupplierPayment(data),
    onSuccess: (_data, variables) => {
      toast.success('Supplier payment recorded');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(variables.supplierId) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRecordSupplierAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, data }: { supplierId: string; data: Parameters<typeof suppliersApi.recordAdjustment>[1] }) =>
      suppliersApi.recordAdjustment(supplierId, data),
    onSuccess: (_data, variables) => {
      toast.success('Adjustment recorded');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(variables.supplierId) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
