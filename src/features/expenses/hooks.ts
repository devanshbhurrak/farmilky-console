import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expensesApi, type ExpenseSummary, type ExpenseSummaryParams } from './api';
import type { ExpenseInput } from './schemas';
import type { Expense, ExpenseListParams } from '@/types/expense';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isNaN(n) ? fallback : n;
}

/** Tolerate `{ total }` / `{ totalAmount }` / nested summaries from the backend. */
function parseSummary(response: unknown): ExpenseSummary {
  const raw = unwrapData<unknown>(response as { data?: unknown });
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const byRaw = obj.byCategory ?? obj.breakdown ?? obj.categories ?? obj.by_category;
  const byCategory = Array.isArray(byRaw)
    ? byRaw.map((row) => {
        const o = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
        return {
          category: String(o.category ?? o._id ?? o.name ?? 'other'),
          total: toNumber(o.total ?? o.amount ?? o.totalAmount),
          count: toNumber(o.count ?? o.entries ?? o.totalEntries),
        };
      })
    : [];
  return {
    total: toNumber(obj.total ?? obj.totalAmount ?? obj.sum),
    count: toNumber(obj.count ?? obj.totalEntries ?? obj.entries),
    byCategory,
  };
}

export function useExpenses(params: ExpenseListParams) {
  return useQuery({
    queryKey: queryKeys.expenses.list(params),
    queryFn: async () => normalizeList<Expense>(await expensesApi.list(params)),
    placeholderData: keepPreviousData,
  });
}

export function useExpenseSummary(params: ExpenseSummaryParams) {
  return useQuery({
    queryKey: queryKeys.expenses.summary(params),
    queryFn: async () => parseSummary(await expensesApi.summary(params)),
    placeholderData: keepPreviousData,
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.expenses.all(), 'detail', id ?? ''],
    queryFn: async () => unwrapData<Expense>(await expensesApi.get(id ?? '')),
    enabled: Boolean(id),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseInput) => expensesApi.create(data),
    onSuccess: () => {
      toast.success('Expense recorded');
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseInput }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      toast.success('Expense updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
