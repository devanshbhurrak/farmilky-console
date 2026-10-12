import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { FormField } from '@/components/form/form-field';
import { Sheet, SheetBody, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ManifestEntry } from '@/types/manifest';
import { useUpdateManifestEntry } from '../hooks';
import { entryUpdateSchema } from '../schemas';
import type { ManifestEntryUpdateInput } from '../schemas';

export function ManifestEntryCard({
  entry,
  manifestId,
  onUpdate,
}: {
  entry: ManifestEntry;
  manifestId: string;
  onUpdate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const updateEntry = useUpdateManifestEntry();

  const form = useForm<ManifestEntryUpdateInput>({
    resolver: zodResolver(entryUpdateSchema),
    defaultValues: {
      status: (entry.status as ManifestEntryUpdateInput['status']) ?? 'pending',
      deliveryNotes: entry.deliveryNotes ?? '',
      failureReason: entry.failureReason ?? '',
    },
  });

  const mapsHref =
    entry.lat != null && entry.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}`
      : entry.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.address)}`
        : null;

  const submit = (values: ManifestEntryUpdateInput) => {
    updateEntry.mutate(
      { manifestId, entryId: entry.id, data: values },
      {
        onSuccess: () => {
          setOpen(false);
          onUpdate?.();
        },
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-slate-900">
              #{entry.sequence} · {entry.customerName}
            </div>
            <div className="text-slate-600">
              {entry.productLabel ?? entry.productName ?? ''}
              {entry.quantity != null && ` · Qty ${entry.quantity}`}
            </div>
          </div>
          <StatusBadge status={entry.status} />
        </div>
        {entry.address && <div className="text-xs text-slate-500">{entry.address}</div>}
        <div className="flex flex-wrap gap-2">
          {entry.phone && (
            <a href={`tel:${entry.phone}`}>
              <Button variant="outline" size="sm" className="min-h-11">
                <Phone /> Call
              </Button>
            </a>
          )}
          {mapsHref && (
            <a href={mapsHref} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="min-h-11">
                <MapPin /> Navigate
              </Button>
            </a>
          )}
          <Button size="sm" onClick={() => setOpen(true)} className="min-h-11">
            Update
          </Button>
        </div>
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetBody>
          <SheetHeader>
            <SheetTitle>Update entry · {entry.customerName}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(submit)} className="mt-4 flex flex-col gap-4">
            <FormField label="Status" required error={form.formState.errors.status?.message}>
              <Select {...form.register('status')}>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </Select>
            </FormField>
            <FormField label="Delivery notes" error={form.formState.errors.deliveryNotes?.message}>
              <Textarea {...form.register('deliveryNotes')} placeholder="Notes for the delivery" />
            </FormField>
            <FormField label="Failure reason" error={form.formState.errors.failureReason?.message} hint="Required when failed">
              <Input {...form.register('failureReason')} placeholder="Why did delivery fail?" />
            </FormField>
            <Button type="submit" loading={updateEntry.isPending} className="min-h-11">
              Save update
            </Button>
          </form>
        </SheetBody>
      </Sheet>
    </Card>
  );
}
