import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DataTable, type Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/auth-provider';
import { formatDate, getId } from '@/lib/utils';
import type { Holiday } from '@/types/holiday';
import { useCreateHoliday, useDeleteHoliday, useHolidays, useToggleHoliday } from './hooks';
import type { HolidayInput } from './schemas';
import { HolidayForm } from './components/holiday-form';

export default function HolidaysPage() {
  const { isAdmin } = useAuth();
  const currentYear = new Date().getFullYear();
  const [searchParams, setSearchParams] = useSearchParams();
  const year = Number(searchParams.get('year')) || currentYear;
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const { data, isLoading, isError, refetch } = useHolidays(year);
  const items = data?.items ?? [];

  const createMutation = useCreateHoliday();
  const toggleMutation = useToggleHoliday();
  const deleteMutation = useDeleteHoliday();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Holiday | null>(null);

  const columns: Column<Holiday>[] = [
    {
      header: 'Date',
      cell: (h) => <span className="whitespace-nowrap font-medium">{formatDate(h.date)}</span>,
    },
    {
      header: 'Name',
      cell: (h) => <span className="text-slate-900">{h.name}</span>,
    },
    {
      header: 'Status',
      cell: (h) => <StatusBadge status={h.isActive ? 'active' : 'inactive'} />,
    },
  ];
  if (isAdmin) {
    columns.push({
      header: 'Actions',
      cell: (h) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={h.isActive}
            onChange={() =>
              toggleMutation.mutate({ id: getId(h), isActive: !h.isActive })
            }
            aria-label={`Toggle ${h.name}`}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleting(h)}
            aria-label={`Delete ${h.name}`}
          >
            <Trash2 className="text-red-600" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Holidays"
        description="Delivery holidays — no deliveries are scheduled on active holidays"
        actions={
          isAdmin ? (
            <Button onClick={() => setSheetOpen(true)}>
              <Plus />
              Add holiday
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <Select
          value={String(year)}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams);
            next.set('year', e.target.value);
            setSearchParams(next);
          }}
          aria-label="Select year"
          className="w-auto"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(h, i) => getId(h) || `holiday-${i}`}
        loading={isLoading || toggleMutation.isPending}
        error={isError ? 'Failed to load holidays' : null}
        onRetry={() => refetch()}
        emptyTitle="No holidays found"
        emptyMessage={`No holidays recorded for ${year}.`}
        emptyActionLabel={isAdmin ? 'Add holiday' : undefined}
        onEmptyAction={isAdmin ? () => setSheetOpen(true) : undefined}
        renderCard={(h) => (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium text-slate-900">{h.name}</p>
                <p className="text-xs text-slate-500">{formatDate(h.date)}</p>
              </div>
              <StatusBadge status={h.isActive ? 'active' : 'inactive'} />
              {isAdmin ? (
                <Switch
                  checked={h.isActive}
                  onChange={() =>
                    toggleMutation.mutate({ id: getId(h), isActive: !h.isActive })
                  }
                  aria-label={`Toggle ${h.name}`}
                />
              ) : null}
            </CardContent>
          </Card>
        )}
      />

      {isAdmin && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Add holiday</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <HolidayForm
                onSubmit={(values: HolidayInput) =>
                  createMutation.mutate(values, {
                    onSuccess: () => setSheetOpen(false),
                  })
                }
                submitting={createMutation.isPending}
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
        title="Delete holiday?"
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
