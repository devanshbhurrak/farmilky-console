import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';
import type { Manifest, ManifestListParams } from '@/types/manifest';
import { manifestsApi, toManifest } from './api';
import type { GenerateManifestRequest, ManifestEntryUpdate } from './api';

export function useManifests(params: ManifestListParams) {
  return useQuery({
    queryKey: queryKeys.manifests.list({ ...params }),
    queryFn: async () => {
      const res = await manifestsApi.list(params);
      const { items } = normalizeList<unknown>(res);
      let mapped = items.map(toManifest);
      if (params.agentId) {
        mapped = mapped.filter((m) => {
          const id = typeof m.agentId === 'string' ? m.agentId : m.agentId?.id;
          return id === params.agentId;
        });
      }
      if (params.status) mapped = mapped.filter((m) => m.status === params.status);
      const page = params.page ?? 1;
      const limit = params.limit ?? 20;
      const start = (page - 1) * limit;
      return {
        items: mapped.slice(start, start + limit),
        meta: {
          total: mapped.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(mapped.length / limit)),
        },
      };
    },
    placeholderData: keepPreviousData,
  });
}

export function useManifest(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.manifests.detail(id ?? ''),
    queryFn: async (): Promise<Manifest> => {
      const res = await manifestsApi.get(id as string);
      const data = unwrapData<Record<string, unknown>>(res as unknown as Record<string, unknown>);
      return toManifest(data.manifest ?? data);
    },
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

function invalidateManifests(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.manifests.all() });
  queryClient.invalidateQueries({ queryKey: ['subscriptions', 'delivery-board'] });
}

export function useGenerateManifests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateManifestRequest) => manifestsApi.generate(data),
    onSuccess: () => {
      invalidateManifests(queryClient);
      toast.success('Manifests generated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useResequenceManifest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entryIds }: { id: string; entryIds: string[] }) =>
      manifestsApi.resequence(id, entryIds),
    onSuccess: () => {
      invalidateManifests(queryClient);
      toast.success('Sequence updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateManifestEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      manifestId,
      entryId,
      data,
    }: {
      manifestId: string;
      entryId: string;
      data: ManifestEntryUpdate;
    }) => manifestsApi.updateEntry(manifestId, entryId, data),
    onSuccess: () => {
      invalidateManifests(queryClient);
      toast.success('Entry updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useMyToday() {
  return useQuery({
    queryKey: queryKeys.manifests.today(),
    queryFn: async () => {
      const res = await manifestsApi.myToday();
      return unwrapData<Manifest>(res);
    },
    placeholderData: keepPreviousData,
  });
}

export function useMyHistory(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.manifests.history({ ...params }),
    queryFn: async () => {
      const res = await manifestsApi.myHistory(params);
      const { items, meta } = normalizeList<unknown>(res);
      return { items: items.map(toManifest), meta };
    },
    placeholderData: keepPreviousData,
  });
}
