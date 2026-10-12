import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { milkApi } from './api';
import type { CollectionHistoryParams, ConfirmCollectionInput, UpdateCollectionInput } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';

export function useDailyCollections(date: string) {
  return useQuery({
    queryKey: queryKeys.milkCollections.daily(date),
    queryFn: () => milkApi.daily(date),
    enabled: date.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useGenerateDaily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => milkApi.generate(date),
    onSuccess: (_data, date) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milkCollections.daily(date) });
      queryClient.invalidateQueries({ queryKey: queryKeys.milkCollections.all() });
      toast.success('Daily collections generated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useConfirmCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmCollectionInput }) => milkApi.confirm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milkCollections.all() });
      toast.success('Collection confirmed');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCollectionInput }) => milkApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milkCollections.all() });
      toast.success('Collection updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCollectionHistory(params: CollectionHistoryParams) {
  return useQuery({
    queryKey: queryKeys.milkCollections.history(params),
    queryFn: () => milkApi.history(params),
    placeholderData: keepPreviousData,
  });
}

export function useTodayShift() {
  return useQuery({
    queryKey: queryKeys.milkCollections.todayShift(),
    queryFn: () => milkApi.todayShift(),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
