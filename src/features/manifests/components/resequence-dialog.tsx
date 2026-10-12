import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getId } from '@/lib/utils';
import type { Manifest } from '@/types/manifest';
import { useResequenceManifest } from '../hooks';

export function ResequenceDialog({
  manifest,
  open,
  onOpenChange,
}: {
  manifest: Manifest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [order, setOrder] = useState<string[]>([]);
  const resequence = useResequenceManifest();

  useEffect(() => {
    if (open && manifest?.entries) {
      setOrder([...manifest.entries].sort((a, b) => a.sequence - b.sequence).map((e) => getId(e) || e.id));
    }
  }, [open, manifest]);

  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= order.length) return;
    setOrder((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item as string);
      return copy;
    });
  };

  const labelFor = (entryId: string): string => {
    const entry = manifest?.entries?.find((e) => (getId(e) || e.id) === entryId);
    return entry ? `#${entry.sequence} · ${entry.customerName}` : entryId;
  };

  const save = () => {
    if (!manifest) return;
    resequence.mutate(
      { id: getId(manifest) || manifest.id, entryIds: order },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Resequence deliveries</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className="flex flex-col gap-2">
          {order.map((entryId, i) => (
            <div
              key={entryId}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-800">{labelFor(entryId)}</span>
              <span className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={i === order.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown />
                </Button>
              </span>
            </div>
          ))}
          {order.length === 0 && <p className="text-sm text-slate-500">No entries to sequence.</p>}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={save} loading={resequence.isPending}>
          Save sequence
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
