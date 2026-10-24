import { API_BASE, api, apiPdfUrl } from '@/lib/api-client';

export function upiPaymentUrl(invoiceId: string): string {
  return `${API_BASE}/pay/upi?invoiceId=${encodeURIComponent(invoiceId)}`;
}
import type { Invoice, InvoiceListParams } from '@/types/invoice';
import type { PaginatedResponse } from '@/types/common';

export interface GenerateInvoiceInput {
  month: number;
  year: number;
}

export interface BulkGenerateInput {
  month: number;
  year: number;
}

export const invoicesApi = {
  list: (params?: InvoiceListParams) =>
    api.get<PaginatedResponse<Invoice> | { success: boolean; data: Invoice[] }>(
      '/api/invoices/admin',
      params as Record<string, string | number | boolean | null | undefined>,
    ),

  get: (id: string) =>
    api.get<{ success: boolean; data: Invoice }>(`/api/invoices/admin/${id}`),

  /** Idempotent — safe to retry. */
  generateForCustomer: (userId: string, input: GenerateInvoiceInput) =>
    api.post<{ success: boolean; data: Invoice }>(
      `/api/invoices/admin/generate/${userId}`,
      input,
      { idempotent: true },
    ),

  /** Idempotent — safe to retry. */
  generateBulk: (input: BulkGenerateInput) =>
    api.post<{ success: boolean; data: unknown }>('/api/invoices/admin/generate-bulk', input, {
      idempotent: true,
    }),

  regenerate: (id: string) =>
    api.post<{ success: boolean; data: Invoice }>(`/api/invoices/admin/${id}/regenerate`),

  updateStatus: (id: string, status: string, extra?: Record<string, unknown>) =>
    api.patch<{ success: boolean; data: Invoice }>(`/api/invoices/admin/${id}/status`, {
      status,
      ...(extra ?? {}),
    }),

  sendWhatsapp: (id: string) =>
    api.post<{ success: boolean; data: unknown }>(`/api/invoices/admin/${id}/send-whatsapp`),

  pdfUrl: (id: string, detailed = false): string =>
    apiPdfUrl(
      `${API_BASE}/api/invoices/admin/${id}/pdf${detailed ? '?detailed=true&download=true' : '?download=true'}`,
    ),

  customersLite: (search?: string) =>
    api.get<{ success: boolean; data: unknown }>('/api/users/admin/all', {
      role: 'customer',
      limit: 20,
      search: search ?? undefined,
    }),
};
