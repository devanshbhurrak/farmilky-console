import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/form/form-field';
import { Sheet, SheetBody, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBulkPause, useBulkResume } from '../hooks';

export function SubscriptionBulkActions({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseFrom, setPauseFrom] = useState('');
  const [pauseUntil, setPauseUntil] = useState('');

  const bulkPause = useBulkPause();
  const bulkResume = useBulkResume();

  if (selectedIds.length === 0) return null;

  const pause = () => {
    bulkPause.mutate(
      { ids: selectedIds, pauseFrom: pauseFrom || undefined, pauseUntil: pauseUntil || undefined },
      {
        onSuccess: () => {
          setPauseOpen(false);
          onDone();
        },
      },
    );
  };

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Badge variant="info">{selectedIds.length} selected</Badge>
        <Button size="sm" variant="outline" onClick={() => setPauseOpen(true)} className="min-h-11">
          Pause
        </Button>
        <Button
          size="sm"
          variant="outline"
          loading={bulkResume.isPending}
          onClick={() => bulkResume.mutate(selectedIds, { onSuccess: onDone })}
          className="min-h-11"
        >
          Resume
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} className="min-h-11">
          Clear
        </Button>
      </div>

      <Sheet open={pauseOpen} onOpenChange={setPauseOpen}>
        <SheetBody>
          <SheetHeader>
            <SheetTitle>Pause {selectedIds.length} subscriptions</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-4">
            <FormField label="Pause from" hint="Optional start date">
              <Input type="date" value={pauseFrom} onChange={(e) => setPauseFrom(e.target.value)} />
            </FormField>
            <FormField label="Pause until" hint="Optional end date">
              <Input type="date" value={pauseUntil} onChange={(e) => setPauseUntil(e.target.value)} />
            </FormField>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button onClick={pause} loading={bulkPause.isPending} className="min-h-11 w-full">
            Pause selected
          </Button>
        </SheetFooter>
      </Sheet>
    </>
  );
}
