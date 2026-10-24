import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { useRegisterHeaderAction } from '@/components/layout/header-action-context';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { FilterButton, FilterDrawer, useFilterDrawer } from '@/components/data/filter-drawer';
import { FormField } from '@/components/form/form-field';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { useComplaints, useCreateComplaint, useUpdateComplaintStatus } from './hooks';
import { ComplaintForm } from './components/complaint-form';
import { formatDate, getErrorMessage, getId, getName, titleCase } from '@/lib/utils';
import type { Complaint } from '@/types/complaint';

const NEXT_STATUS: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
};

export default function ComplaintsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const category = params.get('category') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;

  const filters = useFilterDrawer({ status, category });

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const debouncedSearch = useDebounce(search, 400);
  const query = useComplaints({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
    category: category || undefined,
  });
  const [createOpen, setCreateOpen] = React.useState(false);
  const createMutation = useCreateComplaint();

  const createAction = React.useMemo(
    () => (
      <Button className="min-h-11" onClick={() => setCreateOpen(true)}>
        New complaint
      </Button>
    ),
    [setCreateOpen]
  );
  useRegisterHeaderAction(createAction);
  const statusMutation = useUpdateComplaintStatus();

  const [resolving, setResolving] = React.useState<Complaint | null>(null);
  const [resolution, setResolution] = React.useState('');
  const [advancingId, setAdvancingId] = React.useState('');

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const advance = (complaint: Complaint) => {
    const current = String(complaint.status);
    const next = NEXT_STATUS[current];
    if (!next) return;
    setAdvancingId(getId(complaint));
    statusMutation.mutate(
      { id: getId(complaint), status: next },
      { onSettled: () => setAdvancingId('') },
    );
  };

  const columns: Column<Complaint>[] = [
    {
      header: 'Subject',
      cell: (c) => (
        <div>
          <p className="font-medium text-slate-900">{c.subject}</p>
          <p className="max-w-70 truncate text-xs text-slate-500">{c.description ?? ''}</p>
        </div>
      ),
    },
    { header: 'Customer', cell: (c) => c.customerName ?? getName(c.userId) },
    { header: 'Category', cell: (c) => (c.category ? titleCase(c.category) : '—') },
    { header: 'Status', cell: (c) => <StatusBadge status={String(c.status)} /> },
    { header: 'Date', cell: (c) => formatDate(c.createdAt) },
    {
      header: 'Action',
      cell: (c) => {
        const next = NEXT_STATUS[String(c.status)];
        if (!next) return <span className="text-xs text-slate-400">—</span>;
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              loading={statusMutation.isPending && advancingId === getId(c)}
              onClick={() => advance(c)}
            >
              → {titleCase(next)}
            </Button>
            <Button size="sm" variant="ghost" className="min-h-11" onClick={() => { setResolving(c); setResolution(c.resolution ?? ''); }}>
              Notes
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Complaints" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SearchInput value={search} onChange={(v) => set({ search: v, page: '' })} placeholder="Search complaints…" className="flex-1 md:max-w-70" />
          <FilterButton
            activeCount={[Boolean(status), Boolean(category)].filter(Boolean).length}
            onClick={filters.openDrawer}
          />
        </div>
        <div className="hidden gap-3 md:flex md:items-center">
          <Select aria-label="Status filter" value={status} onChange={(e) => set({ status: e.target.value, page: '' })} className="md:w-48">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Input aria-label="Category filter" placeholder="Category" value={category} onChange={(e) => set({ category: e.target.value, page: '' })} className="md:w-40" />
        </div>
      </div>

      <FilterDrawer
        open={filters.open}
        onOpenChange={filters.setOpen}
        activeCount={[Boolean(status), Boolean(category)].filter(Boolean).length}
        onApply={() => {
          set({ status: filters.draft.status, category: filters.draft.category, page: '' });
          filters.setOpen(false);
        }}
        onReset={() => filters.setDraft({ status: '', category: '' })}
      >
        <FormField label="Status">
          <Select aria-label="Status filter" value={filters.draft.status} onChange={(e) => filters.setField('status', e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </FormField>
        <FormField label="Category">
          <Input aria-label="Category filter" placeholder="Category" value={filters.draft.category} onChange={(e) => filters.setField('category', e.target.value)} />
        </FormField>
      </FilterDrawer>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(c) => getId(c)}
        loading={query.isLoading}
        error={query.isError ? getErrorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        emptyTitle="No complaints"
        emptyMessage="No complaints match your filters."
        emptyActionLabel="New complaint"
        onEmptyAction={() => setCreateOpen(true)}
        page={meta?.page ?? page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        onPageChange={(p) => set({ page: String(p) })}
        renderCard={(c) => (
          <Card>
            <CardContent className="flex flex-col gap-2 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{c.subject}</p>
                <StatusBadge status={String(c.status)} />
              </div>
              <p className="text-xs text-slate-500">{c.description ?? 'No description'}</p>
              <p className="text-xs text-slate-500">
                {c.customerName ?? getName(c.userId)} · {formatDate(c.createdAt)}
              </p>
              {NEXT_STATUS[String(c.status)] && (
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 w-full"
                  loading={statusMutation.isPending && advancingId === getId(c)}
                  onClick={() => advance(c)}
                >
                  → {titleCase(NEXT_STATUS[String(c.status)])}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>New complaint</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <ComplaintForm
              submitting={createMutation.isPending}
              onSubmit={(values) =>
                createMutation.mutate(
                  {
                    subject: values.subject,
                    description: values.description,
                    relatedTo: values.relatedTo,
                    referenceType: values.referenceType || undefined,
                    referenceId: values.referenceId || undefined,
                  },
                  { onSuccess: () => setCreateOpen(false) },
                )
              }
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Dialog open={resolving !== null} onOpenChange={(open) => { if (!open) setResolving(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolution notes</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">{resolving?.subject}</p>
            <Textarea rows={4} placeholder="Write resolution…" value={resolution} onChange={(e) => setResolution(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button
              loading={statusMutation.isPending}
              onClick={() => {
                if (!resolving) return;
                statusMutation.mutate(
                  { id: getId(resolving), status: String(resolving.status), resolution: resolution || undefined },
                  { onSuccess: () => setResolving(null) },
                );
              }}
            >
              Save notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
