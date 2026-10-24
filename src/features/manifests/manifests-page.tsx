import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardList, Plus } from 'lucide-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { StatusBadge } from '@/components/data/status-badge';
import { FormField } from '@/components/form/form-field';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate, getErrorMessage, getId, getName, normalizeList, titleCase, todayLocal } from '@/lib/utils';
import type { Manifest } from '@/types/manifest';
import { manifestsApi } from './api';
import { useGenerateManifests, useManifests, useMyHistory } from './hooks';
import { generateSchema } from './schemas';
import type { GenerateManifestInput } from './schemas';
import { ManifestCard, manifestAgentName, manifestAreaName } from './components/manifest-table';

const PAGE_LIMIT = 20;

export default function ManifestsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generateOpen, setGenerateOpen] = useState(false);

  const date = searchParams.get('date') || todayLocal();
  const slot = searchParams.get('slot') || '';
  const agentId = searchParams.get('agentId') || '';
  const status = searchParams.get('status') || '';
  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1);

  const debouncedDate = useDebounce(date, 300);

  const filters = useFilterDrawer({ slot, agentId, status });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const adminQuery = useManifests({
    page,
    limit: PAGE_LIMIT,
    date: isAdmin ? debouncedDate || undefined : undefined,
    slot: isAdmin ? slot || undefined : undefined,
    agentId: isAdmin ? agentId || undefined : undefined,
    status: status || undefined,
  });

  const historyQuery = useMyHistory({ page, limit: PAGE_LIMIT });

  const agentsQuery = useQuery({
    queryKey: ['agents', 'lite'],
    queryFn: async () => {
      const res = await manifestsApi.agentsLite();
      return normalizeList<{ id: string; name: string }>(res, ['agents', 'users']).items.map((a) => ({
        id: getId(a),
        name: getName(a),
      }));
    },
    placeholderData: keepPreviousData,
    enabled: isAdmin,
  });

  const generateMutation = useGenerateManifests();

  const generateForm = useForm<GenerateManifestInput>({
    resolver: zodResolver(generateSchema),
    defaultValues: { date: todayLocal(), slot: '' },
  });

  const items = isAdmin ? (adminQuery.data?.items ?? []) : (historyQuery.data?.items ?? []);
  const meta = isAdmin ? adminQuery.data?.meta : historyQuery.data?.meta;
  const loading = isAdmin ? adminQuery.isLoading : historyQuery.isLoading;
  const queryError = isAdmin ? adminQuery.error : historyQuery.error;
  const refetch = () => (isAdmin ? adminQuery.refetch() : historyQuery.refetch());

  const goDetail = (m: Manifest) => navigate(`/manifests/${getId(m) || m.id}`);

  const columns: Column<Manifest>[] = [
    {
      header: 'Agent',
      cell: (m) => <span className="font-medium text-slate-900">{manifestAgentName(m)}</span>,
    },
    {
      header: 'Area',
      cell: (m) => manifestAreaName(m),
    },
    {
      header: 'Date / slot',
      cell: (m) => `${formatDate(m.date)} · ${titleCase(m.slot ?? '')}`,
    },
    {
      header: 'Status',
      cell: (m) => <StatusBadge status={m.status} />,
    },
    {
      header: 'Progress',
      cell: (m) => {
        const s = m.summary;
        if (!s) return '—';
        return `${s.delivered}/${s.total} delivered`;
      },
    },
  ];

  const generateAction = useMemo(
    () =>
      isAdmin ? (
        <Button onClick={() => setGenerateOpen(true)} className="min-h-11">
          <Plus /> Generate
        </Button>
      ) : null,
    [isAdmin, setGenerateOpen],
  );
  useRegisterHeaderAction(generateAction);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={isAdmin ? 'Manifests' : 'My History'} />

      {isAdmin ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input type="date" value={date} onChange={(e) => updateParam('date', e.target.value)} aria-label="Date filter" className="flex-1" />
            <FilterButton
              activeCount={[Boolean(slot), Boolean(agentId), Boolean(status)].filter(Boolean).length}
              onClick={filters.openDrawer}
            />
          </div>
          <div className="hidden gap-3 md:grid md:grid-cols-3">
            <Select aria-label="Slot filter" value={slot} onChange={(e) => updateParam('slot', e.target.value)}>
              <option value="">All slots</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </Select>
            <Select aria-label="Agent filter" value={agentId} onChange={(e) => updateParam('agentId', e.target.value)}>
              <option value="">All agents</option>
              {(agentsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            <Select aria-label="Status filter" value={status} onChange={(e) => updateParam('status', e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex md:hidden">
            <FilterButton activeCount={status ? 1 : 0} onClick={filters.openDrawer} className="flex-1" />
          </div>
          <div className="hidden md:block">
            <Select aria-label="Status filter" value={status} onChange={(e) => updateParam('status', e.target.value)} className="md:max-w-xs">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>
      )}

      <FilterDrawer
        open={filters.open}
        onOpenChange={filters.setOpen}
        activeCount={[Boolean(slot), Boolean(agentId), Boolean(status)].filter(Boolean).length}
        onApply={() => {
          const next = new URLSearchParams(searchParams);
          const apply = (key: string, value: string) => {
            if (value) next.set(key, value);
            else next.delete(key);
          };
          apply('slot', filters.draft.slot);
          apply('agentId', filters.draft.agentId);
          apply('status', filters.draft.status);
          next.delete('page');
          setSearchParams(next, { replace: true });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ slot: '', agentId: '', status: '' })}
      >
        {isAdmin ? (
          <FormField label="Slot">
            <Select aria-label="Slot filter" value={filters.draft.slot} onChange={(e) => filters.setField('slot', e.target.value)}>
              <option value="">All slots</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </Select>
          </FormField>
        ) : null}
        {isAdmin ? (
          <FormField label="Agent">
            <Select aria-label="Agent filter" value={filters.draft.agentId} onChange={(e) => filters.setField('agentId', e.target.value)}>
              <option value="">All agents</option>
              {(agentsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
        <FormField label="Status">
          <Select aria-label="Status filter" value={filters.draft.status} onChange={(e) => filters.setField('status', e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
        </FormField>
      </FilterDrawer>

      <DataTable<Manifest>
        data={items}
        columns={columns}
        keyExtractor={(m, i) => getId(m) || m.id || String(i)}
        loading={loading}
        error={queryError ? getErrorMessage(queryError) : null}
        onRetry={refetch}
        emptyTitle={isAdmin ? 'No manifests' : 'No history'}
        emptyMessage="Try adjusting your filters."
        emptyIcon={<ClipboardList className="size-6" />}
        renderCard={(m) => <ManifestCard manifest={m} onClick={() => goDetail(m)} />}
        page={page}
        totalPages={meta?.totalPages ?? 0}
        total={meta?.total ?? 0}
        onPageChange={(p) => updateParam('page', String(p))}
      />

      <Sheet open={generateOpen} onOpenChange={setGenerateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Generate manifests</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <form
              onSubmit={generateForm.handleSubmit((values) =>
                generateMutation.mutate(
                  { date: values.date, slot: values.slot || undefined },
                  { onSuccess: () => setGenerateOpen(false) },
                ),
              )}
              className="flex flex-col gap-4"
            >
              <FormField label="Date" required error={generateForm.formState.errors.date?.message}>
                <Input type="date" {...generateForm.register('date')} />
              </FormField>
              <FormField label="Slot">
                <Select {...generateForm.register('slot')}>
                  <option value="">Both slots</option>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </Select>
              </FormField>
              <Button type="submit" loading={generateMutation.isPending} className="min-h-11">
                Generate
              </Button>
            </form>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
