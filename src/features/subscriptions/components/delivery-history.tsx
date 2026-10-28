import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/form/form-field';
import { StatusBadge } from '@/components/data/status-badge';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetBody, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getErrorMessage, getId, todayLocal } from '@/lib/utils';
import type { DeliveryHistoryEntry } from '@/types/subscription';
import { useDeleteHistoryEntry, useRecordSubscriptionOutcome, useSubscriptionHistory } from '../hooks';
import { outcomeSchema } from '../schemas';
import type { SubscriptionOutcomeInput } from '../schemas';

function parseMonth(value: string | undefined): { month: number; year: number } {
  const now = new Date();
  if (!value) return { month: now.getMonth() + 1, year: now.getFullYear() };
  const [y, m] = value.split('-').map(Number);
  if (!y || !m) return { month: now.getMonth() + 1, year: now.getFullYear() };
  return { month: m, year: y };
}

function toKey(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function shift(month: number, year: number, delta: number): { month: number; year: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function DeliveryHistory({
  subscriptionId,
  startMonth,
  slots,
}: {
  subscriptionId: string;
  startMonth?: string;
  // Per-slot config; when multiple slots are configured the outcome form
  // requires picking which slot the outcome applies to (backend requirement).
  slots?: Array<{ slot: 'morning' | 'evening'; quantityPerDelivery: number }>; 
}) {
  const isMultiSlot = (slots?.length ?? 0) > 1;
  const now = new Date();
  const currentKey = toKey(now.getMonth() + 1, now.getFullYear());
  const minKey = (startMonth ?? '').slice(0, 7) || '2000-01';

  const [cursor, setCursor] = useState(() => parseMonth(currentKey));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryHistoryEntry | null>(null);
  const [deleting, setDeleting] = useState<DeliveryHistoryEntry | null>(null);

  const cursorKey = toKey(cursor.month, cursor.year);
  const canPrev = cursorKey > minKey;
  const canNext = cursorKey < currentKey;

  const historyQuery = useSubscriptionHistory(subscriptionId, { month: cursor.month, year: cursor.year });
  const recordOutcome = useRecordSubscriptionOutcome();
  const deleteEntry = useDeleteHistoryEntry();

  const items = useMemo(() => historyQuery.data?.items ?? [], [historyQuery.data]);

  const summary = useMemo(() => {
    let qty = 0;
    let amount = 0;
    for (const e of items) {
      const q = e.actualQuantity ?? e.quantity ?? 0;
      qty += Number(q) || 0;
      amount += Number(e.amount ?? (e.rate != null ? Number(q) * Number(e.rate) : 0)) || 0;
    }
    return { records: items.length, qty, amount };
  }, [items]);

  const form = useForm<SubscriptionOutcomeInput>({
    resolver: zodResolver(outcomeSchema) as unknown as Resolver<SubscriptionOutcomeInput>,
    defaultValues: { deliveryDate: '', status: 'delivered' },
  });

  const openAdd = () => {
    setEditing(null);
    form.reset({
      deliveryDate: '',
      slot: slots?.[0]?.slot,
      status: 'delivered',
      actualQuantity: undefined,
      reason: '',
      notes: '',
    });
    setSheetOpen(true);
  };

  const openEdit = (entry: DeliveryHistoryEntry) => {
    setEditing(entry);
    form.reset({
      deliveryDate: entry.deliveryDate.slice(0, 10),
      slot:
        ((entry.deliverySlot ?? entry.slot) as 'morning' | 'evening' | undefined) ??
        slots?.[0]?.slot,
      status: (entry.status as SubscriptionOutcomeInput['status']) ?? 'delivered',
      actualQuantity: entry.actualQuantity ?? entry.quantity,
      reason: entry.reason ?? '',
      notes: entry.notes ?? '',
    });
    setSheetOpen(true);
  };

  const onSubmit = (values: SubscriptionOutcomeInput) => {
    // The backend rejects outcomes without a slot for multi-slot subscriptions.
    if (isMultiSlot && !values.slot) {
      toast.error('Select which slot this outcome applies to');
      return;
    }
    recordOutcome.mutate(
      { id: subscriptionId, data: values },
      {
        onSuccess: () => {
          setSheetOpen(false);
          form.reset();
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Delivery history</CardTitle>
          <Button size="sm" onClick={openAdd} className="min-h-11">
            <Plus /> Record outcome
          </Button>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => canPrev && setCursor((c) => shift(c.month, c.year, -1))}>
            Prev
          </Button>
          <span className="text-sm font-medium text-slate-800" aria-live="polite">
            {cursorKey}
          </span>
          <Button variant="outline" size="sm" disabled={!canNext} onClick={() => canNext && setCursor((c) => shift(c.month, c.year, 1))}>
            Next
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 text-xs text-slate-600">
          <Badge variant="secondary">{summary.records} records</Badge>
          <Badge variant="secondary">Qty {summary.qty}</Badge>
          <Badge variant="secondary">{formatCurrency(summary.amount)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {historyQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : historyQuery.isError ? (
          <ErrorState
            message={getErrorMessage(historyQuery.error)}
            onRetry={() => historyQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState title="No history" message={`No delivery records for ${cursorKey}.`} />
        ) : (
          <>
            <div className="flex flex-col gap-2 md:hidden">
              {items.map((e) => (
                <div key={getId(e)} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatDate(e.deliveryDate)}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-1 text-slate-600">
                    {isMultiSlot && (e.deliverySlot ?? e.slot) != null && (
                      <>
                        {(e.deliverySlot ?? e.slot) === 'evening' ? 'Evening' : 'Morning'} ·{' '}
                      </>
                    )}
                    Qty {e.actualQuantity ?? e.quantity ?? '—'}
                    {e.rate != null && ` · Rate ${formatCurrency(e.rate)}`}
                    {e.amount != null && ` · ${formatCurrency(e.amount)}`}
                  </div>
                  {(e.reason || e.notes) && <div className="mt-1 text-xs text-slate-500">{e.reason ?? e.notes}</div>}
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(e)} aria-label="Edit entry">
                      <Pencil /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleting(e)} aria-label="Delete entry">
                      <Trash2 /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                    {isMultiSlot && (
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Slot</th>
                    )}
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Note</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={getId(e)} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">{formatDate(e.deliveryDate)}</td>
                      {isMultiSlot && (
                        <td className="px-4 py-3">
                          {(e.deliverySlot ?? e.slot) != null
                            ? (e.deliverySlot ?? e.slot) === 'evening'
                              ? 'Evening'
                              : 'Morning'
                            : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-4 py-3">{e.actualQuantity ?? e.quantity ?? '—'}</td>
                      <td className="px-4 py-3">{e.rate != null ? formatCurrency(e.rate) : '—'}</td>
                      <td className="px-4 py-3">{e.amount != null ? formatCurrency(e.amount) : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{e.reason ?? e.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(e)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetBody>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit outcome' : 'Record outcome'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <FormField label="Delivery date" required error={form.formState.errors.deliveryDate?.message}>
              <Input type="date" max={todayLocal()} {...form.register('deliveryDate')} />
            </FormField>
            {isMultiSlot && (
              <FormField label="Slot" required error={form.formState.errors.slot?.message}>
                <Select {...form.register('slot')}>
                  <option value="">Select slot</option>
                  {slots?.map((s) => (
                    <option key={s.slot} value={s.slot}>
                      {s.slot === 'morning' ? 'Morning' : 'Evening'}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Status" required error={form.formState.errors.status?.message}>
              <Select {...form.register('status')}>
                <option value="delivered">Delivered</option>
                <option value="partial">Partial</option>
                <option value="extra">Extra</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </Select>
            </FormField>
            <FormField label="Actual quantity" error={form.formState.errors.actualQuantity?.message}>
              <Input type="number" min={0} step="any" {...form.register('actualQuantity')} />
            </FormField>
            <FormField label="Reason" error={form.formState.errors.reason?.message}>
              <Input {...form.register('reason')} placeholder="Reason for failed / skipped" />
            </FormField>
            <FormField label="Notes" error={form.formState.errors.notes?.message}>
              <Textarea {...form.register('notes')} placeholder="Optional notes" />
            </FormField>
            <Button type="submit" loading={recordOutcome.isPending} className="min-h-11">
              Save outcome
            </Button>
          </form>
        </SheetBody>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete history entry?"
        description="This will permanently remove this delivery record."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          deleteEntry.mutate(
            { id: subscriptionId, entryId: getId(deleting) },
            { onSuccess: () => setDeleting(null) },
          );
        }}
        loading={deleteEntry.isPending}
      />
    </Card>
  );
}
