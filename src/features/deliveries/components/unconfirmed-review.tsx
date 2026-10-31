import { useState, useCallback, useMemo } from 'react';
import { AlertTriangle, Clock3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/data/status-badge';
import { cn, formatDate, formatNumber, getErrorMessage } from '@/lib/utils';
import type { UnconfirmedDelivery } from '@/types/delivery';
import { deliveriesApi } from '../api';
import { useConfirmUnconfirmed, useUnconfirmedDeliveries } from '../hooks';

export function UnconfirmedReview({ onClose }: { onClose: () => void }) {
  const confirmUnconfirmed = useConfirmUnconfirmed();
  const [days] = useState<number>(7);

  const query = useUnconfirmedDeliveries({ days, slot: undefined });
  const items = (query.data?.items ?? []) as UnconfirmedDelivery[];

  const groups = useMemo(() => {
    const map = new Map<string, { date: string; deliveries: UnconfirmedDelivery[] }>();
    for (const d of items) {
      const existing = map.get(d.deliveryDate);
      if (existing) existing.deliveries.push(d);
      else map.set(d.deliveryDate, { date: d.deliveryDate, deliveries: [d] });
    }
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [items]);

  const handleConfirm = async (dateFilter: string | null) => {
    try {
      await confirmUnconfirmed.mutateAsync({ days, slot: undefined });
      query.refetch();
    } catch (err) {
      // errors are toasted by the hook
    }
  };

  if (query.isLoading) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="bottom" className="lg:w-[440px] max-h-[80dvh]">
          <SheetHeader>
            <SheetTitle>Review unconfirmed</SheetTitle>
          </SheetHeader>
          <div className="p-6 flex flex-col items-center justify-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Clock3 className="size-6" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-500">Loading unconfirmed deliveries…</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (query.isError) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="bottom" className="lg:w-[440px] max-h-[80dvh]">
          <SheetHeader>
            <SheetTitle>Review unconfirmed</SheetTitle>
          </SheetHeader>
          <div className="p-6">
            <p className="text-sm text-rose-600">{getErrorMessage(query.error)}</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} className="mt-3">
              Retry
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="bottom" className="lg:w-[440px] max-h-[80dvh]">
        <SheetHeader>
          <SheetTitle>Review unconfirmed</SheetTitle>
          <p className="text-xs text-slate-500">
            Confirm pending deliveries from previous days. Each delivery is charged on its own
            scheduled date — never treated as today&rsquo;s delivery.
          </p>
        </SheetHeader>

        <div className="overflow-y-auto p-3 space-y-3">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <AlertTriangle className="mb-2 size-6 text-slate-400" aria-hidden="true" />
              <p className="text-sm">No unconfirmed deliveries in the last {days} days.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.date} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-900">{formatDate(g.date)}</span>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      {g.deliveries.length} pending
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {g.deliveries.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-1.5 px-1 py-1 rounded bg-slate-50/50">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-800 truncate">{d.customerName}</div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <StatusBadge status={d.status} className="text-[9px] px-1.5 py-0.5" />
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span>{formatNumber(d.scheduledQuantity)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirm(d.deliveryDate)}
                          className="h-6 px-1.5 text-[10px]"
                        >
                          Confirm
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfirm(g.date)}
                    className="w-full h-7 mt-1 text-[10px] font-medium"
                  >
                    <RefreshCw className="mr-1 size-3" aria-hidden="true" />
                    Confirm all for {formatDate(g.date)}
                  </Button>
                </div>
              ))}
              <Separator />
              <Button
                variant="default"
                size="sm"
                onClick={() => handleConfirm(null)}
                disabled={confirmUnconfirmed.isPending}
                className="w-full h-8 text-xs font-semibold"
              >
                {confirmUnconfirmed.isPending ? 'Confirming…' : `Confirm all ${items.length} pending`}
              </Button>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
