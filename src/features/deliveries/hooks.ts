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
      data: DeliveryOutcomeInput;
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
