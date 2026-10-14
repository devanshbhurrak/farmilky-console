import { api } from '@/lib/api-client';
import type { BalanceSummary } from '@/types/transaction';
import type { ListParams, PaginatedResponse } from '@/types/common';

export interface BalanceListParams extends ListParams {
  page?: number;
  limit?: number;
  search?: string;
  balance?: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  date?: string;
  notes?: string;
  description?: string;
}

export interface RecordBalancePaymentInput {
  userId: string;
  amount: number;
  date: string;
  transactionId?: string;
  notes?: string;
}

export interface RecordBalanceAdjustmentInput {
  userId: string;
  type: 'credit_adjustment' | 'debit_adjustment';
  amount: number;
  date: string;
  notes?: string;
}

export const balancesApi = {
  list: (params?: BalanceListParams) =>
    api.get<PaginatedResponse<BalanceSummary>>(
      '/api/users/admin/all',
      { role: 'customer', ...(params as Record<string, string | number | boolean | null | undefined>) },
    ),

  updateTransaction: (id: string, data: UpdateTransactionInput) =>
    api.put<{ success: boolean; data: unknown }>(`/api/transactions/${id}`, data),

  deleteTransaction: (id: string) =>
    api.delete<{ success: boolean }>(`/api/transactions/${id}`),

  voidTransaction: (id: string) =>
    api.post<{ success: boolean; data: unknown }>(`/api/transactions/${id}/void`),

  recordPayment: (data: RecordBalancePaymentInput) =>
    api.post<{ success: boolean; data: unknown }>('/api/payments/admin/record', data),

  recordAdjustment: (data: RecordBalanceAdjustmentInput) =>
    api.post<{ success: boolean; data: unknown }>(`/api/users/admin/${data.userId}/adjustments`, {
      type: data.type,
      amount: data.amount,
      date: data.date,
      notes: data.notes,
    }),
};
