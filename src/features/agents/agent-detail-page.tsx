import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { FormSection } from '@/components/form/form-field';
import { StatusBadge } from '@/components/data/status-badge';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, getId } from '@/lib/utils';
import { agentsApi } from './api';
import { useAgent, useDeleteAgent, useSetAgentStatus, useUpdateAgent, useUpdateAgentDeliveryConfig } from './hooks';
import { AgentForm } from './components/agent-form';
import { agentAreaName } from './components/agent-table';
import { DeliveryConfigForm } from './components/delivery-config-form';
import type { DeliveryConfigValues } from './components/delivery-config-form';
import type { UpdateAgentInput } from './schemas';

export default function AgentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: agent, isLoading } = useAgent(id);
  const updateMutation = useUpdateAgent();
  const deliveryConfigMutation = useUpdateAgentDeliveryConfig();
  const statusMutation = useSetAgentStatus();
  const deleteMutation = useDeleteAgent();

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmStatus, setConfirmStatus] = React.useState<boolean | null>(null);

  const { data: areas } = useQuery({
    queryKey: queryKeys.areas.list(),
    queryFn: () => agentsApi.areasLite(),
  });

  async function handleEdit(values: UpdateAgentInput) {
    if (!id) return;
    await updateMutation.mutateAsync({ id, data: { ...values, password: values.password || undefined } });
    setEditOpen(false);
  }

  async function handleDeliveryConfig(values: DeliveryConfigValues) {
    if (!id) return;
    await deliveryConfigMutation.mutateAsync({ id, data: values });
  }

  if (isLoading || !agent) {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-4">
          <PageHeader title="Agent" breadcrumbs={[{ label: 'Agents', path: '/agents' }, { label: 'Details' }]} />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Agent" breadcrumbs={[{ label: 'Agents', path: '/agents' }, { label: 'Details' }]} />
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Agent not found.</CardContent>
        </Card>
      </div>
    );
  }

  const area = agentAreaName(agent);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={agent.name}
        breadcrumbs={[{ label: 'Agents', path: '/agents' }, { label: agent.name }]}
        actions={
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="min-h-11">
            <Pencil aria-hidden /> Edit
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Avatar name={agent.name} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{agent.name}</h2>
              <StatusBadge status={agent.isActive ? 'active' : 'inactive'} />
            </div>
            <p className="text-sm text-slate-500">
              {agent.phone ?? '—'}
              {agent.email ? ` · ${agent.email}` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Joined {formatDate(agent.agentInfo?.joiningDate ?? agent.createdAt)}
              {area ? ` · ${area}` : ' · No area assigned'}
            </p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
            <Switch
              checked={agent.isActive}
              onChange={(e) => setConfirmStatus(e.target.checked)}
              aria-label="Toggle agent status"
            />
            {agent.isActive ? 'Active' : 'Inactive'}
          </label>
        </CardContent>
      </Card>

      <FormSection title="Delivery config" description="Area, route sequence and delivery slot">
        <DeliveryConfigForm
          areas={areas ?? []}
          submitting={deliveryConfigMutation.isPending}
          defaultValues={{
            assignedArea: typeof agent.agentInfo?.assignedArea === 'string' ? agent.agentInfo.assignedArea : '',
            slot: 'morning',
          }}
          onSubmit={handleDeliveryConfig}
        />
      </FormSection>

      <Card>
        <CardHeader>
          <CardTitle>Work details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-slate-500">Vehicle: </span>
            <span className="font-medium">{agent.agentInfo?.vehicleType || '—'}</span>
          </p>
          <p>
            <span className="text-slate-500">Max capacity: </span>
            <span className="font-medium">{agent.agentInfo?.maxCapacity ?? '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            onClick={() => setConfirmStatus(!agent.isActive)}
          >
            {agent.isActive ? 'Deactivate agent' : 'Activate agent'}
          </Button>
          <Button size="sm" variant="destructive" className="min-h-11" onClick={() => setDeleteOpen(true)}>
            Delete agent
          </Button>
        </CardContent>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit agent</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <AgentForm
              mode="edit"
              areas={areas ?? []}
              submitting={updateMutation.isPending}
              defaultValues={{
                name: agent.name,
                email: agent.email ?? '',
                phone: agent.phone ?? '',
                isActive: agent.isActive,
                agentInfo: {
                  joiningDate: agent.agentInfo?.joiningDate?.slice(0, 10) ?? '',
                  vehicleType: agent.agentInfo?.vehicleType ?? '',
                  maxCapacity: agent.agentInfo?.maxCapacity ?? undefined,
                  assignedArea: typeof agent.agentInfo?.assignedArea === 'string' ? agent.agentInfo.assignedArea : '',
                },
              }}
              onSubmit={handleEdit}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmStatus !== null}
        onOpenChange={(o) => { if (!o) setConfirmStatus(null); }}
        title={confirmStatus ? 'Activate agent?' : 'Deactivate agent?'}
        description={confirmStatus ? 'The agent will be able to receive manifests again.' : 'The agent will stop receiving new manifests.'}
        confirmLabel={confirmStatus ? 'Activate' : 'Deactivate'}
        danger={!confirmStatus}
        loading={statusMutation.isPending}
        onConfirm={() => {
          if (id === undefined || confirmStatus === null) return;
          statusMutation.mutate(
            { id, isActive: confirmStatus },
            { onSuccess: () => setConfirmStatus(null) },
          );
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete agent?"
        description={`${agent.name} will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!id) return;
          deleteMutation.mutate(id, {
            onSuccess: () => {
              setDeleteOpen(false);
              navigate('/agents');
            },
          });
        }}
      />
    </div>
  );
}
