import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import type { DeliveryBoardEntry } from '@/types/delivery';
import { deliveriesApi } from './api';
import type { DeliveryBoardParams } from './api';
import type { DeliveryOutcomeInput, ExtraProductsInput } from './schemas';
import type { DeliveryItemOutcome, DeliverySessionState, UnconfirmedDelivery } from '@/types/delivery';

export interface DeliveryBoardData {
  entries: DeliveryBoardEntry[];
  summary: { total: number; remainingDeliveries: number; delivered: number; pending: number };
}

function toBoardData(response: unknown): DeliveryBoardData {
  const root =
    response && typeof response === 'object' && 'data' in response
      ? (response as { data: unknown }).data
      : response;
  if (!root || typeof root !== 'object') {
    return { entries: [], summary: { total: 0, remainingDeliveries: 0, delivered: 0, pending: 0 } };
  }
  const data = root as Record<string, unknown>;
  const entries = Array.isArray(data.entries) ? (data.entries as DeliveryBoardEntry[]) : [];
  const summary = data.summary as DeliveryBoardData['summary'] | undefined;
  return {
    entries,
    summary: summary ?? {
      total: entries.length,
      remainingDeliveries: entries.filter((e) => e.canRecordOutcome).length,
      delivered: entries.filter((e) => e.deliveryStatus === 'delivered').length,
      pending: entries.filter((e) => e.deliveryStatus === 'pending').length,
    },
  };
}

export function useDeliveryBoard(params: DeliveryBoardParams) {
  return useQuery({
    queryKey: queryKeys.subscriptions.deliveryBoard(params.date ?? '', params.slot ?? ''),
    queryFn: async (): Promise<DeliveryBoardData> => {
      const res = await deliveriesApi.board(params);
      return toBoardData(res);
    },
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/**
 * Record a delivery outcome through the canonical unified endpoint. Replaces
 * the per-module legacy calls so subscriptions, orders and instant deliveries
 * share one idempotent, transactional path (no duplicate charges).
 */
export function useRecordDeliveryOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entry,
      data,
    }: {
      entry: Pick<
        DeliveryBoardEntry,
        'userId' | 'type' | 'subscriptionId' | 'orderId' | 'deliverySlot' | 'id' | 'deliveryId' | 'scheduledQuantity'
      >;
      data: DeliveryOutcomeInput & {
        pricePerPacket?: number;
        items?: DeliveryItemOutcome[];
        idempotencyKey?: string | null;
        expectedVersion?: number | null;
        paymentReceived?: {
          amount: number;
          paymentMethod: string;
          paymentRef?: string | null;
        } | null;
      };
    }) => {
      const { deliveryDate, slot, paymentReceived, ...rest } = data;
      return deliveriesApi.recordDeliveryOutcome({
        customerId: entry.userId,
        type: entry.type as 'subscription' | 'order' | 'instant',
        referenceType: entry.type as 'subscription' | 'order',
        referenceId: (() => {
          const ref = entry.subscriptionId ?? entry.orderId;
          if (!ref) throw new Error('Missing subscriptionId or orderId for delivery outcome');
          return ref;
        })(),
        deliveryDate: deliveryDate ?? new Date().toISOString().slice(0, 10),
        deliverySlot: (slot ?? entry.deliverySlot) as 'morning' | 'evening' | null | undefined,
        paymentReceived: paymentReceived ?? null,
        ...rest,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.manifests.all() });
      toast.success('Outcome recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

type RecordDeliveryOutcomeRequestStatus =
  | 'pending'
  | 'delivered'
  | 'partial'
  | 'extra'
  | 'failed'
  | 'skipped'
  | 'missed';

// Legacy wrapper kept for any callers still referencing the per-module split.
// Delegates to the canonical unified endpoint so there is a single charge path.
export function useRecordOutcome() {
  const unified = useRecordDeliveryOutcome();
  return {
    ...unified,
    mutate: (variables: { kind: 'subscription' | 'order'; id: string; data: DeliveryOutcomeInput }) => {
      unified.mutate({
        entry: {
          userId: '',
          type: variables.kind as 'subscription' | 'order' | 'instant',
          subscriptionId: variables.kind === 'subscription' ? variables.id : undefined,
          orderId: variables.kind === 'order' ? variables.id : undefined,
          deliverySlot: undefined,
          id: variables.id,
        },
        data: variables.data,
      });
    },
    mutateAsync: async (variables: { kind: 'subscription' | 'order'; id: string; data: DeliveryOutcomeInput }) => {
      return unified.mutateAsync({
        entry: {
          userId: '',
          type: variables.kind as 'subscription' | 'order' | 'instant',
          subscriptionId: variables.kind === 'subscription' ? variables.id : undefined,
          orderId: variables.kind === 'order' ? variables.id : undefined,
          deliverySlot: undefined,
          id: variables.id,
        },
        data: variables.data,
      });
    },
  };
}

export function useCorrectDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => deliveriesApi.correctDelivery(id, data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      toast.success('Delivery corrected');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRescheduleDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      deliveriesApi.rescheduleDelivery(id, data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      toast.success('Delivery rescheduled');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCancelDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => deliveriesApi.cancelDelivery(id, data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      toast.success('Delivery cancelled');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      deliveriesApi.recordPayment(id, data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      toast.success('Payment recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useInstantDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExtraProductsInput) => deliveriesApi.instantDelivery(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      toast.success('Extra products delivered');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

/** Session availability (morning/evening) for a date. Falls back to server truth. */
export function useSessionState(date?: string) {
  return useQuery({
    queryKey: queryKeys.deliveries.sessionState(date ?? ''),
    queryFn: async () => {
      const res = await deliveriesApi.sessionState({ date: date ?? undefined });
      return (res as unknown as { data: DeliverySessionState }).data;
    },
    enabled: !!date,
    staleTime: 60_000,
  });
}

/** Single delivery detail (for the details drawer). */
export function useDelivery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.deliveries.detail(id ?? ''),
    queryFn: async () => {
      const res = await deliveriesApi.getDelivery(id!);
      return (res as unknown as { data: { delivery: unknown; items: unknown[] } }).data;
    },
    enabled: !!id,
  });
}

/** List pending prior-day deliveries for bulk confirmation. */
export function useUnconfirmedDeliveries(params: { days?: number; slot?: 'morning' | 'evening' }) {
  return useQuery({
    queryKey: queryKeys.deliveries.unconfirmed(params.days ?? 7, params.slot ?? 'all'),
    queryFn: async () => {
      const res = await deliveriesApi.unconfirmed({ days: params.days, slot: params.slot });
      return (res as unknown as { data: { fromDate: string; toDate: string; days: number; total: number; items: UnconfirmedDelivery[] } }).data;
    },
  });
}

/** Bulk-confirm pending prior-day deliveries (legacy bulkConfirmDay equivalent). */
export function useConfirmUnconfirmed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { days?: number; slot?: 'morning' | 'evening' }) => {
      const res = await deliveriesApi.confirmUnconfirmed(params);
      return (res as unknown as { data: { fromDate: string; toDate: string; days: number; total: number; confirmed: number; failed: number; failures: unknown[] } }).data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveries.all() });
      if (result.failed > 0) {
        toast.warning(`Confirmed ${result.confirmed} / ${result.total}; ${result.failed} failed`);
      } else {
        toast.success(`Confirmed ${result.confirmed} delivery${result.confirmed !== 1 ? 's' : ''}`);
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeliveryBoardSSE(enabled: boolean): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let source: EventSource | null = null;
    try {
      source = new EventSource(`${API_BASE}/api/sse/manifest`, { withCredentials: true } as EventSourceInit);
      const handler = () => {
        queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      };
      source.addEventListener('manifest:entry_updated', handler);
    } catch {
      source = null;
    }
    return () => {
      try {
        source?.close();
      } catch {
        /* noop */
      }
    };
  }, [enabled, queryClient]);
}
