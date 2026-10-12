import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList } from '@/lib/utils';
import type { DeliveryBoardEntry } from '@/types/delivery';
import { deliveriesApi } from './api';
import type { DeliveryBoardParams } from './api';
import type { DeliveryOutcomeInput, ExtraProductsInput } from './schemas';

export interface DeliveryBoardData {
  entries: DeliveryBoardEntry[];
  summary: { total: number; remainingDeliveries: number; delivered: number; pending: number };
}

function toBoardData(response: unknown): DeliveryBoardData {
  const root =
    response && typeof response === 'object'
      ? (response as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const { items } = normalizeList<DeliveryBoardEntry>(response, ['entries']);
  const rawSummary = (root.summary ?? root.meta ?? {}) as Record<string, unknown>;
  const total = Number(rawSummary.total ?? items.length ?? 0);
  const delivered = Number(rawSummary.delivered ?? 0);
  const pending =
    Number(rawSummary.pending ?? rawSummary.remainingDeliveries ?? Math.max(total - delivered, 0)) || 0;
  return {
    entries: items,
    summary: {
      total,
      remainingDeliveries: Number(rawSummary.remainingDeliveries ?? pending),
      delivered,
      pending,
    },
  };
}

export function useDeliveryBoard(params: DeliveryBoardParams) {
  return useQuery({
    queryKey: [...queryKeys.subscriptions.deliveryBoard(params.date ?? '', params.slot ?? ''), { ...params }],
    queryFn: async (): Promise<DeliveryBoardData> => {
      const res = await deliveriesApi.board(params);
      return toBoardData(res);
    },
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useRecordOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      id,
      data,
    }: {
      kind: 'subscription' | 'order';
      id: string;
      data: DeliveryOutcomeInput & { subscriptionId?: string; deliveryDate?: string };
    }) =>
      kind === 'order'
        ? deliveriesApi.recordOrderOutcome(id, data)
        : deliveriesApi.recordSubscriptionOutcome(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.manifests.all() });
      toast.success('Outcome recorded');
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

export function useDeliveryBoardSSE(enabled: boolean): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let source: EventSource | null = null;
    try {
      source = new EventSource(`${API_BASE}/api/sse`, { withCredentials: true } as EventSourceInit);
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
