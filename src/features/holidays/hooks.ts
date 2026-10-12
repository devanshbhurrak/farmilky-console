import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { holidaysApi } from './api';
import type { HolidayInput } from './schemas';
import type { Holiday } from '@/types/holiday';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage, normalizeList } from '@/lib/utils';

export function useHolidays(year: number | undefined) {
  return useQuery({
    queryKey: queryKeys.holidays.list({ year }),
    queryFn: async () => normalizeList<Holiday>(await holidaysApi.list(year)),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: HolidayInput) => holidaysApi.create(data),
    onSuccess: () => {
      toast.success('Holiday added');
      void queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useToggleHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      holidaysApi.update(id, { isActive }),
    onSuccess: (_data, vars) => {
      toast.success(vars.isActive ? 'Holiday activated' : 'Holiday deactivated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => holidaysApi.remove(id),
    onSuccess: () => {
      toast.success('Holiday deleted');
      void queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all() });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
