import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/data/search-input';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { getId } from '@/lib/utils';
import type { Area } from '@/types/area';
import {
  useAgentsWithAreas,
  useAreas,
  useCreateArea,
  useDeleteArea,
  useUpdateArea,
} from './hooks';
import type { AreaInput } from './schemas';
import { AreaCard } from './components/area-card';
import { AreaForm } from './components/area-form';

function toAreaInput(area: Area): AreaInput {
  const agent = area.assignedAgent;
  return {
    name: area.name,
    pincodes: area.pincodes ?? [],
    localities: area.localities ?? [],
    assignedAgent: typeof agent === 'string' ? agent : agent ? getId(agent) : undefined,
    sequence: area.sequence ?? 0,
  };
}

export default function AreasPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const debouncedSearch = useDebounce(rawSearch, 400);

  const { data, isLoading, isError, refetch } = useAreas();
  const { data: agentOptions } = useAgentsWithAreas();
  const createMutation = useCreateArea();
  const updateMutation = useUpdateArea();
  const deleteMutation = useDeleteArea();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Area | null>(null);
  const [deleting, setDeleting] = React.useState<Area | null>(null);

  const areas = React.useMemo(() => {
    const list = [...(data?.items ?? [])];
    list.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.pincodes ?? []).some((p) => p.toLowerCase().includes(q)) ||
        (a.localities ?? []).some((l) => l.toLowerCase().includes(q)),
    );
  }, [data, debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  // kept for the empty-state "Add area" action

  const handleFormSubmit = (values: AreaInput) => {
    if (editing) {
      updateMutation.mutate(
        { id: getId(editing), data: values },
        { onSuccess: () => setSheetOpen(false) },
      );
    } else {
      createMutation.mutate(values, { onSuccess: () => setSheetOpen(false) });
    }
  };

  const createAction = React.useMemo(
    () =>
      isAdmin ? (
        <Button
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
          className="px-3 py-1.5 text-sm"
        >
          <Plus aria-hidden />
          Area
        </Button>
      ) : null,
    [isAdmin, setEditing, setSheetOpen],
  );
  useRegisterHeaderAction(createAction);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Areas" />

      <SearchInput
        value={rawSearch}
        onChange={(v) => {
          const next = new URLSearchParams(searchParams);
          if (v) next.set('search', v);
          else next.delete('search');
          setSearchParams(next);
        }}
        placeholder="Search name, pincode or locality…"
        className="sm:max-w-xs"
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Failed to load areas" onRetry={() => refetch()} />
      ) : areas.length === 0 ? (
        <EmptyState
          title="No areas found"
          message="Try adjusting your search, or create a new delivery area."
          actionLabel={isAdmin ? 'Add area' : undefined}
          onAction={isAdmin ? openCreate : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <AreaCard
              key={getId(area) || area.name}
              area={area}
              onManage={() => navigate(`/areas/${getId(area)}/customers`)}
              onEdit={() => {
                setEditing(area);
                setSheetOpen(true);
              }}
              onDelete={() => setDeleting(area)}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{editing ? 'Edit area' : 'Add area'}</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <AreaForm
                key={editing ? getId(editing) : 'new'}
                defaultValues={editing ? toAreaInput(editing) : undefined}
                agents={agentOptions ?? []}
                onSubmit={handleFormSubmit}
                submitting={createMutation.isPending || updateMutation.isPending}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete area?"
        description={deleting ? `"${deleting.name}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(getId(deleting), {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
