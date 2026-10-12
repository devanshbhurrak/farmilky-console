import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList } from '@/lib/utils';
import type { BalanceSummary } from '@/types/transaction';
import { balancesApi, type BalanceListParams, type RecordBalanceAdjustmentInput, type RecordBalancePaymentInput } from './api';

export function useBalances(params: BalanceListParams) {
  return useQuery({
    queryKey: queryKeys.balances.list(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await balancesApi.list(params);
      return normalizeList<BalanceSummary>(res, ['balances']);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useRecordBalancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordBalancePaymentInput) => balancesApi.recordPayment(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['balances'] });
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Payment recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRecordBalanceAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordBalanceAdjustmentInput) => balancesApi.recordAdjustment(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['balances'] });
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Adjustment recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useVoidTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => balancesApi.voidTransaction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['balances'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction voided');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
