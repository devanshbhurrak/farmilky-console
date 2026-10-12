import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';
import type { SupplierPayment } from '@/types/payment';
import type { Customer, LedgerEntry } from '@/types/customer';
import type { Supplier } from '@/types/supplier';
import {
  paymentsApi,
  type CustomerBalanceParams,
  type PassbookParams,
  type RecordAdjustmentInput,
  type RecordPaymentInput,
  type RecordSupplierAdjustmentInput,
  type RecordSupplierPaymentInput,
  type SupplierPaymentListParams,
  type UpdatePaymentInput,
} from './api';

export interface PassbookData {
  entries: LedgerEntry[];
  debits: number;
  credits: number;
  net: number;
}

function toPassbookData(response: unknown): PassbookData {
  const data = unwrapData<unknown>(response as { success?: boolean; data?: unknown });
  let entries: LedgerEntry[] = [];
  if (Array.isArray(data)) {
    entries = data as LedgerEntry[];
  } else if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.entries)) {
      entries = obj.entries as LedgerEntry[];
    } else {
      const { items } = normalizeList<LedgerEntry>(response, ['entries', 'transactions', 'ledger']);
      entries = items;
    }
  }
  let debits = 0;
  let credits = 0;
  for (const e of entries) {
    const amt = Number(e.amount ?? 0);
    if (e.type === 'debit') debits += amt;
    else credits += amt;
  }
  return { entries, debits, credits, net: debits - credits };
}

function invalidatePaymentCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['payments'] });
  void queryClient.invalidateQueries({ queryKey: ['balances'] });
  void queryClient.invalidateQueries({ queryKey: ['transactions'] });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentInput) => paymentsApi.recordPayment(data),
    onSuccess: () => {
      invalidatePaymentCaches(queryClient);
      toast.success('Payment recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRecordCustomerAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordAdjustmentInput) => paymentsApi.recordAdjustment(data),
    onSuccess: () => {
      invalidatePaymentCaches(queryClient);
      toast.success('Adjustment recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.deletePayment(id),
    onSuccess: () => {
      invalidatePaymentCaches(queryClient);
      toast.success('Payment deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ refId, data }: { refId: string; data: UpdatePaymentInput }) =>
      paymentsApi.updatePayment(refId, data),
    onSuccess: (result) => {
      invalidatePaymentCaches(queryClient);
      toast.success(result === null ? 'Entry no longer exists on server' : 'Payment updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function usePassbook(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.passbook(userId),
    queryFn: async (): Promise<PassbookData> => {
      const res = await paymentsApi.passbook(userId);
      return toPassbookData(res);
    },
    enabled: Boolean(userId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSupplierPayments(params: SupplierPaymentListParams) {
  return useQuery({
    queryKey: queryKeys.payments.supplier(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await paymentsApi.supplierPayments(params);
      return normalizeList<SupplierPayment>(res, ['supplierPayments', 'payments']);
    },
    placeholderData: keepPreviousData,
  });
}

export function useRecordSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordSupplierPaymentInput) => paymentsApi.recordSupplierPayment(data),
    onSuccess: () => {
      invalidatePaymentCaches(queryClient);
      toast.success('Supplier payment recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRecordSupplierAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, data }: { supplierId: string; data: RecordSupplierAdjustmentInput }) =>
      paymentsApi.recordSupplierAdjustment(supplierId, data),
    onSuccess: () => {
      invalidatePaymentCaches(queryClient);
      toast.success('Supplier adjustment recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSupplierCollectionTotal(supplierId: string, from: string, to: string) {
  return useQuery({
    queryKey: [...queryKeys.payments.supplier({}), 'collection-total', supplierId, from, to],
    queryFn: () => paymentsApi.supplierCollectionTotal(supplierId, from, to),
    enabled: Boolean(supplierId && from && to),
    placeholderData: keepPreviousData,
  });
}

export function useCustomersWithBalance(params: CustomerBalanceParams) {
  return useQuery({
    queryKey: queryKeys.payments.list({ scope: 'customers-balance', ...(params as Record<string, unknown>) }),
    queryFn: async () => {
      const res = await paymentsApi.customersWithBalance(params);
      return normalizeList<Customer>(res, ['customers', 'users']);
    },
    placeholderData: keepPreviousData,
  });
}

export function useSuppliersLite() {
  return useQuery({
    queryKey: queryKeys.suppliers.list({ scope: 'lite' }),
    queryFn: async (): Promise<Supplier[]> => {
      const res = await paymentsApi.suppliersLite();
      const data = unwrapData<Supplier[] | { suppliers: Supplier[] }>(res as { data: Supplier[] | { suppliers: Supplier[] } });
      if (Array.isArray(data)) return data;
      if (data !== null && typeof data === 'object' && 'suppliers' in data && Array.isArray((data as { suppliers: unknown }).suppliers)) {
        return (data as { suppliers: Supplier[] }).suppliers;
      }
      return normalizeList<Supplier>(res, ['suppliers']).items;
    },
    placeholderData: keepPreviousData,
  });
}
