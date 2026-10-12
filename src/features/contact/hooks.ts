import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contactApi } from './api';
import type { ContactListParams } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';

export function useContactMessages(params: ContactListParams) {
  return useQuery({
    queryKey: queryKeys.contact.list(params),
    queryFn: () => contactApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateContactStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => contactApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contact.all() });
      toast.success('Message updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
