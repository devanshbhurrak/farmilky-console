import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ordersApi } from './api';
import type { DeliveryOutcomeInput } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import type { OrderListParams } from '@/types/order';

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params as Record<string, unknown>),
    queryFn: () => ordersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: () => ordersApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => ordersApi.create(data),
    onSuccess: () => {
      toast.success('Order created');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => ordersApi.update(id, data),
    onSuccess: (_data, variables) => {
      toast.success('Order updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      toast.success(`Order ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useOrderOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeliveryOutcomeInput }) => ordersApi.deliveryOutcome(id, data),
    onSuccess: (_data, variables) => {
      toast.success('Delivery outcome recorded');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useInstantDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => ordersApi.instantDelivery(data),
    onSuccess: () => {
      toast.success('Order delivered instantly');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
