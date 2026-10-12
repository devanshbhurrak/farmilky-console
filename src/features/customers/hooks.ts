import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { customersApi } from './api';
import type { RecordAdjustmentInput, RecordPaymentInput } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import type { CustomerListParams } from '@/types/customer';
import type { Order } from '@/types/order';

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: queryKeys.customers.list(params as Record<string, unknown>),
    queryFn: () => customersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: () => customersApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => customersApi.create(data),
    onSuccess: () => {
      toast.success('Customer created');
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => customersApi.update(id, data),
    onSuccess: (_data, variables) => {
      toast.success('Customer updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateDeliveryConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => customersApi.updateDeliveryConfig(id, data),
    onSuccess: (_data, variables) => {
      toast.success('Delivery config updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCustomerSubscriptions(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.list({ userId: userId ?? '' }),
    queryFn: () => customersApi.activeSubscriptions(userId as string),
    enabled: !!userId,
  });
}

export function useCustomerOrders(userId: string | undefined) {
  return useQuery<Order[]>({
    queryKey: queryKeys.orders.list({ customerId: userId ?? '' }),
    queryFn: () => customersApi.customerOrders(userId as string),
    enabled: !!userId,
  });
}

export function useCustomerPassbook(userId: string | undefined, opts?: { month?: number; year?: number }) {
  return useQuery({
    queryKey: [...queryKeys.payments.passbook(userId ?? ''), { month: opts?.month, year: opts?.year }],
    queryFn: () => customersApi.passbook(userId as string, { month: opts?.month, year: opts?.year }),
    enabled: !!userId,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentInput) => customersApi.recordPayment(data),
    onSuccess: (_data, variables) => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.passbook(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRecordAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: RecordAdjustmentInput }) =>
      customersApi.recordAdjustment(userId, data),
    onSuccess: (_data, variables) => {
      toast.success('Balance adjusted');
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.passbook(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
