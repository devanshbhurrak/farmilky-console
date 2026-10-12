import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { complaintsApi } from './api';
import type { ComplaintListParams, CreateComplaintInput } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';

export function useComplaints(params: ComplaintListParams) {
  return useQuery({
    queryKey: queryKeys.complaints.list(params),
    queryFn: () => complaintsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateComplaintInput) => complaintsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all() });
      toast.success('Complaint created');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) =>
      complaintsApi.updateStatus(id, { status, resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all() });
      toast.success('Complaint updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
