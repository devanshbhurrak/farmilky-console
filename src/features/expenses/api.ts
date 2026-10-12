import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { Expense, ExpenseListParams } from '@/types/expense';
import type { ExpenseInput } from './schemas';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface ExpenseSummaryParams {
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseSummary {
  total: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
}

export const expensesApi = {
  list: (params?: ExpenseListParams) =>
    api.get<PaginatedResponse<Expense> | ApiResponse<Expense[]>>(
      '/api/expenses',
      (params ?? {}) as QueryParams,
    ),
  summary: (params?: ExpenseSummaryParams) =>
    api.get<unknown>('/api/expenses/summary', (params ?? {}) as QueryParams),
  get: (id: string) => api.get<ApiResponse<Expense>>(`/api/expenses/${id}`),
  create: (data: ExpenseInput) => api.post<ApiResponse<Expense>>('/api/expenses', data),
  update: (id: string, data: ExpenseInput) =>
    api.put<ApiResponse<Expense>>(`/api/expenses/${id}`, data),
  remove: (id: string) => api.delete<ApiResponse<unknown>>(`/api/expenses/${id}`),
};
