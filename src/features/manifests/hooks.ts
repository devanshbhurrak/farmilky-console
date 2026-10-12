import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList, unwrapData } from '@/lib/utils';
import type { Manifest, ManifestListParams } from '@/types/manifest';
import { manifestsApi } from './api';
import type { GenerateManifestRequest, ManifestEntryUpdate } from './api';

export function useManifests(params: ManifestListParams) {
  return useQuery({
    queryKey: queryKeys.manifests.list({ ...params }),
    queryFn: async () => {
      const res = await manifestsApi.list(params);
      const { items, meta } = normalizeList<Manifest>(res);
      return { items, meta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useManifest(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.manifests.detail(id ?? ''),
    queryFn: async (): Promise<Manifest> => {
      const res = await manifestsApi.get(id as string);
      return unwrapData<Manifest>(res);
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
      const { items, meta } = normalizeList<Manifest>(res);
      return { items, meta };
    },
    placeholderData: keepPreviousData,
  });
}
