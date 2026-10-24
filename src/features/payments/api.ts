import { api } from '@/lib/api-client';
import type { Payment, SupplierPayment } from '@/types/payment';
import type { Customer, LedgerEntry } from '@/types/customer';
import type { Supplier } from '@/types/supplier';
import type { ListParams, PaginatedResponse } from '@/types/common';

export interface CustomerBalanceParams extends ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PassbookParams extends ListParams {
  page?: number;
  limit?: number;
}

export interface RecordPaymentInput {
  userId: string;
  amount: number;
  date: string;
  receivedDate?: string;
  transactionId?: string;
  notes?: string;
}

export interface UpdatePaymentInput {
  amount?: number;
  date?: string;
  receivedDate?: string;
  transactionId?: string;
  notes?: string;
}

export interface RecordAdjustmentInput {
  userId: string;
  type: 'credit_adjustment' | 'debit_adjustment';
  amount: number;
  date: string;
  notes?: string;
}

export interface RecordSupplierPaymentInput {
  supplierId: string;
  fromDate: string;
  toDate: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'upi';
  transactionRef?: string;
  notes?: string;
}

export interface RecordSupplierAdjustmentInput {
  type: 'credit_adjustment' | 'debit_adjustment';
  amount: number;
  date: string;
  notes?: string;
}

export interface SupplierPaymentListParams extends ListParams {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: string;
  from?: string;
  to?: string;
}

export const paymentsApi = {
  recordPayment: (data: RecordPaymentInput) =>
    api.post<{ success: boolean; data: Payment }>('/api/payments/admin/record', data),

  /** Customer balance adjustment. Backend symmetry with supplier adjustments. */
  recordAdjustment: (data: RecordAdjustmentInput) =>
    api.post<{ success: boolean; data: unknown }>(`/api/users/admin/${data.userId}/adjustments`, {
      type: data.type,
      amount: data.amount,
      date: data.date,
      notes: data.notes,
    }),

  deletePayment: (id: string) =>
    api.delete<{ success: boolean }>(`/api/payments/admin/${id}`),

  /** Tolerates 404 (already synced / voided entries). Returns null when missing. */
  updatePayment: async (refId: string, data: UpdatePaymentInput): Promise<unknown> => {
    try {
      return await api.put<{ success: boolean; data: unknown }>(`/api/payments/admin/${refId}`, data);
    } catch (err) {
      if (err !== null && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 404) {
        return null;
      }
      throw err;
    }
  },

  passbook: (userId: string, params?: PassbookParams) =>
    api.get<{ success: boolean; data: unknown }>(
      `/api/payments/${userId}`,
      params as Record<string, string | number | boolean | null | undefined>,
    ),

  supplierPayments: (params?: SupplierPaymentListParams) =>
    api.get<PaginatedResponse<SupplierPayment> | { success: boolean; data: SupplierPayment[] }>(
      '/api/supplier-payments',
      {
        page: params?.page,
        limit: params?.limit,
        supplierId: params?.supplierId,
        fromDate: params?.from || undefined,
        toDate: params?.to || undefined,
      },
    ),

  recordSupplierPayment: (data: RecordSupplierPaymentInput) =>
    api.post<{ success: boolean; data: SupplierPayment }>('/api/supplier-payments', {
      supplierId: data.supplierId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentRef: data.transactionRef || undefined,
      notes: data.notes || undefined,
    }),

  /** Returns { total } — empty total on failure so the form still renders. */
  supplierCollectionTotal: async (
    supplierId: string,
    from: string,
    to: string,
  ): Promise<{ total: number }> => {
    try {
      const res = await api.get<{ success: boolean; data: { total: number } | number }>(
        '/api/supplier-payments/collection-total',
        { supplierId, startDate: from || undefined, endDate: to || undefined },
      );
      const data = (res as { data?: unknown }).data ?? res;
      if (typeof data === 'number') return { total: data };
      if (data !== null && typeof data === 'object' && 'total' in data) {
        return { total: Number((data as { total: unknown }).total ?? 0) };
      }
      return { total: 0 };
    } catch {
      return { total: 0 };
    }
  },

  recordSupplierAdjustment: (supplierId: string, data: RecordSupplierAdjustmentInput) =>
    api.post<{ success: boolean; data: unknown }>(`/api/suppliers/${supplierId}/adjustments`, data),

  customersWithBalance: (params?: CustomerBalanceParams) =>
    api.get<PaginatedResponse<Customer> | { success: boolean; data: Customer[] }>(
      '/api/users/admin/all',
      { role: 'customer', ...(params as Record<string, string | number | boolean | null | undefined>) },
    ),

  suppliersLite: () =>
    api.get<{ success: boolean; data: Supplier[] | { suppliers: Supplier[] } }>(
      '/api/suppliers',
      { limit: 100 },
    ),
};

export type { LedgerEntry };
