import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data/data-table';
import type { Column } from '@/components/data/data-table';
import { SearchInput } from '@/components/data/search-input';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { useContactMessages, useUpdateContactStatus } from './hooks';
import { formatDate, getErrorMessage, getId } from '@/lib/utils';
import type { ContactMessage } from '@/types/contact';

export default function ContactMessagesPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const debouncedSearch = useDebounce(search, 400);
  const query = useContactMessages({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });
  const updateMutation = useUpdateContactStatus();
  const [updatingId, setUpdatingId] = React.useState('');

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const mark = (id: string, next: string) => {
    setUpdatingId(id);
    updateMutation.mutate({ id, status: next }, { onSettled: () => setUpdatingId('') });
  };

  const columns: Column<ContactMessage>[] = [
    {
      header: 'From',
      cell: (m) => (
        <div className="flex items-center gap-2">
          <Avatar name={m.name} className="size-8 text-xs" />
          <div>
            <p className="font-medium text-slate-900">{m.name}</p>
            <p className="text-xs text-slate-500">{m.email ?? m.phone ?? ''}</p>
          </div>
        </div>
      ),
    },
    { header: 'Message', cell: (m) => <span className="block max-w-80 truncate">{m.message}</span> },
    { header: 'Status', cell: (m) => <StatusBadge status={String(m.status)} /> },
    { header: 'Date', cell: (m) => formatDate(m.createdAt) },
    {
      header: 'Action',
      cell: (m) => {
        const s = String(m.status);
        return (
          <div className="flex gap-2">
            {s !== 'read' && s !== 'replied' && (
              <Button size="sm" variant="outline" className="min-h-11" loading={updateMutation.isPending && updatingId === getId(m)} onClick={() => mark(getId(m), 'read')}>
                Mark read
              </Button>
            )}
            {s !== 'replied' && (
              <Button size="sm" variant="ghost" className="min-h-11" loading={updateMutation.isPending && updatingId === getId(m)} onClick={() => mark(getId(m), 'replied')}>
                Mark replied
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Contact messages" description="Messages submitted via the contact form" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput value={search} onChange={(v) => set({ search: v, page: '' })} placeholder="Search messages…" className="md:max-w-70" />
        <Select aria-label="Status filter" value={status} onChange={(e) => set({ status: e.target.value, page: '' })} className="md:max-w-55">
          <option value="">All statuses</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
        </Select>
      </div>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(m) => getId(m)}
        loading={query.isLoading}
        error={query.isError ? getErrorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        emptyTitle="No messages"
        emptyMessage="No contact messages match your filters."
        page={meta?.page ?? page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        onPageChange={(p) => set({ page: String(p) })}
        renderCard={(m) => (
          <Card>
            <CardContent className="flex flex-col gap-2 pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar name={m.name} className="size-8 text-xs" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500">{formatDate(m.createdAt)}</p>
                  </div>
                </div>
                <StatusBadge status={String(m.status)} />
              </div>
              <p className="text-sm text-slate-700">{m.message}</p>
              <div className="flex gap-2">
                {String(m.status) !== 'read' && String(m.status) !== 'replied' && (
                  <Button size="sm" variant="outline" className="min-h-11 flex-1" loading={updateMutation.isPending && updatingId === getId(m)} onClick={() => mark(getId(m), 'read')}>
                    Mark read
                  </Button>
                )}
                {String(m.status) !== 'replied' && (
                  <Button size="sm" variant="ghost" className="min-h-11 flex-1" loading={updateMutation.isPending && updatingId === getId(m)} onClick={() => mark(getId(m), 'replied')}>
                    Mark replied
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
