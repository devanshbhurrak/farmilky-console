import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';
import type { Invoice, InvoiceListParams } from '@/types/invoice';
import { invoicesApi, type BulkGenerateInput, type GenerateInvoiceInput } from './api';

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await invoicesApi.list(params);
      return normalizeList<Invoice>(res, ['invoices']);
    },
    placeholderData: keepPreviousData,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async (): Promise<Invoice> => {
      const res = await invoicesApi.get(id);
      return unwrapData<Invoice>(res as { success?: boolean; data?: Invoice });
    },
    enabled: Boolean(id),
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: GenerateInvoiceInput }) =>
      invoicesApi.generateForCustomer(userId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      toast.success('Invoice generated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useGenerateBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkGenerateInput) => invoicesApi.generateBulk(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      toast.success('Bulk generation started');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRegenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.regenerate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      toast.success('Invoice regenerated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, extra }: { id: string; status: string; extra?: Record<string, unknown> }) =>
      invoicesApi.updateStatus(id, status, extra),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      toast.success('Invoice status updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSendWhatsapp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.sendWhatsapp(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      toast.success('Invoice sent via WhatsApp');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

