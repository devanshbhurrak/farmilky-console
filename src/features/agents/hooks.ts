import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agentsApi } from './api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import type { AgentListParams } from '@/types/agent';

export function useAgents(params: AgentListParams) {
  return useQuery({
    queryKey: queryKeys.agents.list(params as Record<string, unknown>),
    queryFn: () => agentsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id ?? ''),
    queryFn: () => agentsApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => agentsApi.create(data),
    onSuccess: () => {
      toast.success('Agent created');
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => agentsApi.update(id, data),
    onSuccess: (_data, variables) => {
      toast.success('Agent updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSetAgentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => agentsApi.setStatus(id, isActive),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? 'Agent activated' : 'Agent deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentsApi.remove(id),
    onSuccess: () => {
      toast.success('Agent deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all() });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateAgentDeliveryConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => agentsApi.updateDeliveryConfig(id, data),
    onSuccess: (_data, variables) => {
      toast.success('Delivery config updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(variables.id) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAgentToday() {
  return useQuery({
    queryKey: queryKeys.agents.dashboard(),
    queryFn: () => agentsApi.myToday(),
    staleTime: 30_000,
  });
}
