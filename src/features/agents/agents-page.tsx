import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FilterBar } from '@/components/data/filter-bar';
import type { ActiveFilter } from '@/components/data/filter-bar';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, getErrorMessage, getId } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { agentsApi } from './api';
import { useAgents, useCreateAgent } from './hooks';
import { AgentForm } from './components/agent-form';
import { AgentCard, agentAreaName } from './components/agent-table';
import type { CreateAgentInput } from './schemas';
import type { Agent } from '@/types/agent';

export default function AgentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(false);

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? 'all';
  const page = Number(params.get('page') ?? 1) || 1;
  const debouncedSearch = useDebounce(search, 400);

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all' || (k === 'page' && v === '1')) sp.delete(k);
      else sp.set(k, v);
    }
    setParams(sp, { replace: true });
  }

  const { data, isLoading, error, refetch } = useAgents({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMutation = useCreateAgent();

  const { data: areas } = useQuery({
    queryKey: queryKeys.areas.list(),
    queryFn: () => agentsApi.areasLite(),
  });

  const filtered = React.useMemo(() => {
    let items = [...(data?.items ?? [])];
    if (status === 'active') items = items.filter((a) => a.isActive);
    if (status === 'inactive') items = items.filter((a) => !a.isActive);
    if (status === 'unassigned') items = items.filter((a) => !agentAreaName(a));
    return items;
  }, [data, status]);

  const activeFilters: ActiveFilter[] = [];
  if (status !== 'all') activeFilters.push({ key: 'status', label: 'Status', value: status });

  const columns: Column<Agent>[] = [
    {
      header: 'Name',
      cell: (a) => (
        <button onClick={() => navigate(`/agents/${getId(a)}`)} className="flex items-center gap-3 text-left">
          <Avatar name={a.name} />
          <span className="block font-medium text-slate-900 hover:underline">{a.name}</span>
        </button>
      ),
    },
    {
      header: 'Phone',
      cell: (a) => <span className="whitespace-nowrap">{a.phone ?? '—'}</span>,
    },
    {
      header: 'Area',
      cell: (a) => agentAreaName(a) ?? <Badge variant="outline">Unassigned</Badge>,
    },
    {
      header: 'Joined',
      cell: (a) => (
        <span className="whitespace-nowrap">{formatDate(a.agentInfo?.joiningDate ?? a.createdAt)}</span>
      ),
    },
    {
      header: 'Status',
      cell: (a) => <StatusBadge status={a.isActive ? 'active' : 'inactive'} />,
    },
  ];

  async function handleCreate(values: CreateAgentInput) {
    await createMutation.mutateAsync({
      ...values,
      email: values.email || undefined,
      agentInfo:
        values.agentInfo?.assignedArea || values.agentInfo?.vehicleType || values.agentInfo?.maxCapacity !== undefined
          ? { ...values.agentInfo, assignedArea: values.agentInfo?.assignedArea || undefined }
          : undefined,
    });
    setCreateOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agents"
        description="Delivery partners, areas and availability"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="min-h-11">
            <Plus aria-hidden /> New agent
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SearchInput value={search} onChange={(v) => update({ search: v, page: '1' })} placeholder="Search agents…" />
        <Select value={status} onChange={(e) => update({ status: e.target.value, page: '1' })} aria-label="Status filter">
          <option value="all">All agents</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="unassigned">Unassigned area</option>
        </Select>
      </div>

      <FilterBar
        filters={activeFilters}
        onRemove={() => update({ status: 'all', page: '1' })}
        onClearAll={() => update({ status: 'all', page: '1' })}
      />

      <DataTable<Agent>
        data={filtered}
        columns={columns}
        keyExtractor={(a, i) => getId(a) || `agent-${i}`}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => refetch()}
        emptyTitle="No agents found"
        emptyMessage="Try adjusting your search or filters, or add a new agent."
        emptyActionLabel="New agent"
        onEmptyAction={() => setCreateOpen(true)}
        renderCard={(a) => <AgentCard agent={a} onClick={(ag) => navigate(`/agents/${getId(ag)}`)} />}
        page={page}
        totalPages={data?.meta.totalPages ?? 0}
        total={data?.meta.total ?? 0}
        onPageChange={(p) => update({ page: String(p) })}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>New agent</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <AgentForm
              mode="create"
              areas={areas ?? []}
              submitting={createMutation.isPending}
              onSubmit={(v) => handleCreate(v as CreateAgentInput)}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
