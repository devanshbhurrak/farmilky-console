import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { returnsApi } from './api';
import type { ReturnListParams, UpdateReturnStatusInput } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';

export function useReturns(params: ReturnListParams) {
  return useQuery({
    queryKey: queryKeys.returns.list(params),
    queryFn: () => returnsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateReturnStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReturnStatusInput }) =>
      returnsApi.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all() });
      toast.success('Return updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
