import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';
import type { DeliveryHistoryEntry, Subscription, SubscriptionListParams } from '@/types/subscription';
import { subscriptionsApi } from './api';
import type { SubscriptionDetail } from './api';
import type { SubscriptionInput, SubscriptionOutcomeInput } from './schemas';

function monthKey(month: string | number | undefined, year: string | number | undefined): string | null {
  if (month === undefined || year === undefined) return null;
  const m = Number(month);
  const y = Number(year);
  if (Number.isNaN(m) || Number.isNaN(y) || m < 1 || m > 12) return null;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function filterByMonth(items: DeliveryHistoryEntry[], month: string | number | undefined, year: string | number | undefined): DeliveryHistoryEntry[] {
  const key = monthKey(month, year);
  if (!key) return items;
  return items.filter((e) => typeof e.deliveryDate === 'string' && e.deliveryDate.slice(0, 7) === key);
}

export function useSubscriptions(params: SubscriptionListParams) {
  return useQuery({
    queryKey: queryKeys.subscriptions.list({ ...params }),
    queryFn: async () => {
      const res = await subscriptionsApi.list(params);
      const { items, meta } = normalizeList<Subscription>(res);
      return { items, meta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.detail(id ?? ''),
    queryFn: async (): Promise<SubscriptionDetail> => {
      const res = await subscriptionsApi.get(id as string);
      return unwrapData<SubscriptionDetail>(res);
    },
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useSubscriptionHistory(
  id: string | undefined,
  opts: { month?: string | number; year?: string | number } = {},
) {
  const { month, year } = opts;
  return useQuery({
    queryKey: [...queryKeys.subscriptions.detail(id ?? ''), 'history', { month, year }],
    queryFn: async (): Promise<{ items: DeliveryHistoryEntry[] }> => {
      const subId = id as string;
      try {
        const res = await subscriptionsApi.history(subId, { month, year });
        const { items } = normalizeList<DeliveryHistoryEntry>(res, ['history', 'deliveries', 'records']);
        return { items: filterByMonth(items, month, year) };
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          try {
            const detail = await subscriptionsApi.get(subId);
            const data = unwrapData<SubscriptionDetail>(detail);
            const embedded = data.history ?? data.deliveries ?? [];
            return { items: filterByMonth(embedded, month, year) };
          } catch {
            return { items: [] };
          }
        }
        throw err;
      }
    },
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

function invalidateSubscriptionQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all() });
  queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubscriptionInput) => subscriptionsApi.create(input),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('Subscription created');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubscriptionInput> }) =>
      subscriptionsApi.update(id, data),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('Subscription updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateSubscriptionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => subscriptionsApi.updateStatus(id, status),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('Status updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useBulkPause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, pauseFrom, pauseUntil }: { ids: string[]; pauseFrom?: string; pauseUntil?: string }) =>
      subscriptionsApi.bulkPause(ids, { pauseFrom, pauseUntil }),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('Subscriptions paused');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useBulkResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => subscriptionsApi.bulkResume(ids),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('Subscriptions resumed');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useScheduleChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { effectiveDate: string; deliverySchedule?: string; quantityPerDay?: number; slot?: string };
    }) => subscriptionsApi.scheduleChange(id, data),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('Schedule change saved');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCancelScheduleChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.cancelScheduleChange(id),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('Pending schedule change cancelled');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRecordSubscriptionOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubscriptionOutcomeInput }) =>
      subscriptionsApi.recordOutcome(id, {
        deliveryDate: data.deliveryDate,
        status: data.status,
        actualQuantity: data.actualQuantity,
        reason: data.reason,
        notes: data.notes,
      }),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.manifests.all() });
      toast.success('Delivery outcome recorded');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entryId }: { id: string; entryId: string }) => subscriptionsApi.deleteEntry(id, entryId),
    onSuccess: () => {
      invalidateSubscriptionQueries(queryClient);
      toast.success('History entry deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
