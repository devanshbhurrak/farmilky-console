import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';
import type { Subscription, SubscriptionListParams } from '@/types/subscription';
import { subscriptionsApi } from './api';
import type { ScheduleChangeRequest, SubscriptionDetail } from './api';
import type { SubscriptionInput, SubscriptionOutcomeInput } from './schemas';

export function useSubscriptions(params: SubscriptionListParams) {
  return useQuery({
    queryKey: queryKeys.subscriptions.list({ ...params }),
    queryFn: async () => {
      const res = await subscriptionsApi.list(params);
      const { items: rawItems, meta } = normalizeList<Subscription>(res);
      // Backend returns { subscription: {...}, customerName, customerPhone } shaped objects
      const items = rawItems.map((raw) => {
        const r = raw as unknown as Record<string, unknown>;
        if (r.subscription && typeof r.subscription === 'object') {
          const sub = r.subscription as Record<string, unknown>;
          return {
            ...sub,
            customerName: r.customerName ?? sub.customerName,
            customerPhone: r.customerPhone ?? sub.customerPhone,
            customerEmail: r.customerEmail ?? sub.customerEmail,
          } as Subscription;
        }
        return raw;
      });
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
    mutationFn: (ids: string[]) => subscriptionsApi.bulkPause(ids),
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
      data: ScheduleChangeRequest;
    }) =>
    subscriptionsApi.scheduleChange(id, {
      effectiveDate: data.effectiveDate,
      scheduledQty: data.scheduledQty ?? data.quantityPerDay,
      scheduledPrice: data.scheduledPrice,
      deliverySchedule: data.deliverySchedule,
      customDays: data.customDays,
      slot: data.slot,
    }),
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
        slot: data.slot,
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
