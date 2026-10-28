import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const bulkPause = useBulkPause();
  const bulkResume = useBulkResume();

  if (selectedIds.length === 0) return null;

  const pause = () => {
    bulkPause.mutate(
      selectedIds,
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
          <div className="mt-4 text-sm text-slate-600">
            These subscriptions will be paused immediately. Resume them when deliveries should restart.
          </div>
        </SheetBody>
        <SheetFooter>
          <Button onClick={pause} loading={bulkPause.isPending} className="min-h-11 w-full">
            Pause now
          </Button>
        </SheetFooter>
      </Sheet>
    </>
  );
}
