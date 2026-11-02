import { Phone, ChevronRight, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatNumber } from '@/lib/utils';
import type { DeliveryBoardEntry } from '@/types/delivery';

const SESSION_LABEL: Record<string, string> = {
  morning: 'Morning',
  evening: 'Evening',
};

export function DeliveryCard({
  group,
  onCardPress,
  eveningLocked,
}: {
  group: { key: string; customerName: string; phone: string | null; address: string | null; entries: DeliveryBoardEntry[] };
  onCardPress: (entry: DeliveryBoardEntry, entries: DeliveryBoardEntry[]) => void;
  eveningLocked: boolean;
}) {
  const { customerName, phone, address, entries } = group;
  const firstEntry = entries[0];
  const statuses = entries.map((e) => (e.deliveryStatus ?? 'pending').toLowerCase());
  const allDelivered = statuses.every((s) => s === 'delivered');
  const anyFailed = statuses.some((s) => s === 'failed');
  const anyPartial = statuses.some((s) => s === 'partial');
  const anySkipped = statuses.some((s) => s === 'skipped');
  const allPending = statuses.every((s) => s === 'pending');

  const overallStatus: string = allDelivered
    ? 'delivered'
    : anyFailed
      ? 'failed'
      : anyPartial
        ? 'partial'
        : anySkipped
          ? 'skipped'
          : allPending ? 'pending' : 'partial';

  const sessions = [...new Set(entries.map((e) => e.deliverySlot).filter(Boolean))] as string[];
  const totalScheduled = entries.reduce((sum, e) => sum + Number(e.scheduledQuantity ?? e.quantity ?? 0), 0);
  const totalActual = entries.reduce((sum, e) => sum + Number(e.actualQuantity ?? 0), 0);

  const allItems = entries.flatMap((e) =>
    (e.items ?? []).map((it) => ({
      ...it,
      deliverySlot: it.deliverySlot ?? e.deliverySlot ?? 'morning',
    })),
  );

  // Fall back to entry-level product fields when per-item detail is not populated.
  const fallbackItems = entries.map((e) => ({
    productId: `${e.productId ?? e.id}-${e.deliverySlot ?? 'morning'}`,
    productName: e.productName ?? 'Delivery',
    quantity: Number(e.scheduledQuantity ?? e.quantity ?? 0),
    deliveredQuantity: Number(e.actualQuantity ?? 0),
    unit: e.unit ?? null,
    itemStatus: e.deliveryStatus,
    deliverySlot: e.deliverySlot ?? 'morning',
  }));
  const displayItems = allItems.length > 0 ? allItems : fallbackItems;

  return (
      <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-all hover:border-slate-300 focus-within:border-slate-300',
        overallStatus === 'pending' && 'bg-slate-50 border-l-[3px] border-l-green-500',
        overallStatus === 'delivered' && 'bg-slate-200 border-l-[3px] border-l-slate-400',
        overallStatus === 'partial' && 'border-l-[3px] border-l-amber-500',
        overallStatus === 'failed' && 'border-l-[3px] border-l-rose-500',
        overallStatus === 'skipped' && 'border-l-[3px] border-l-amber-500',
      )}
      onClick={() => onCardPress(firstEntry, entries)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onCardPress(firstEntry, entries)}
      aria-label={`Delivery for ${customerName}, ${overallStatus}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-1.5">
            <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900 leading-tight">{customerName}</h3>
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                aria-label={`Call ${customerName}`}
                className="shrink-0 text-slate-500 hover:text-slate-900"
              >
                <Phone className="size-4" aria-hidden="true" />
              </a>
            )}
          </div>
          {address && (
            <div className="mt-0.5 flex min-w-0 items-start gap-1 text-xs text-slate-600">
              <MapPin className="size-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span className="truncate leading-relaxed">{address}</span>
            </div>
          )}
        </div>

        <ChevronRight className="shrink-0 size-4 text-slate-400" aria-hidden="true" />
      </div>

      <div className="mt-1 flex min-w-0 flex-wrap items-start gap-1.5 text-[10px] font-medium text-slate-500">
        {sessions.map((s) => (
          <Badge key={s} variant="outline" className="px-2 py-0.5 shrink-0">
            {SESSION_LABEL[s] || s}
          </Badge>
        ))}
        {eveningLocked && sessions.includes('evening') && (
          <Badge variant="outline" className="px-2 py-0.5 text-amber-600 border-amber-200 shrink-0">
            Locked
          </Badge>
        )}
        {overallStatus === 'delivered' && (
          <Badge variant="outline" className="px-2 py-0.5 text-emerald-700 bg-emerald-50 border-emerald-200 shrink-0">
            Delivered
          </Badge>
        )}
        <span className="ml-auto shrink-0 whitespace-nowrap">
          {totalActual > 0 ? (
            <>
              <span className="font-semibold text-slate-800">{formatNumber(totalActual)}</span>
              <span className="text-slate-300" aria-hidden="true"> / </span>
              <span>{formatNumber(totalScheduled)}</span>
              <span className="text-slate-300" aria-hidden="true"> units</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-800">{formatNumber(totalScheduled)}</span>
              <span className="text-slate-300" aria-hidden="true"> units</span>
            </>
          )}
        </span>
      </div>

      {displayItems.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {displayItems.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="flex min-w-0 items-center justify-between gap-1 px-1 py-0.5 rounded bg-slate-50">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="min-w-0 truncate text-xs text-slate-600">{item.productName}</span>
                {item.deliverySlot && (
                  <Badge variant="outline" className={cn(
                    "text-[8px] px-1 py-0 uppercase shrink-0 font-medium",
                    item.deliverySlot === 'morning' ? 'border-amber-200 text-amber-700 bg-amber-50/50' : 'border-indigo-200 text-indigo-700 bg-indigo-50/50'
                  )}>
                    {SESSION_LABEL[item.deliverySlot] || item.deliverySlot}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] font-mono tabular-nums text-slate-800 shrink-0 whitespace-nowrap">
                {formatNumber(item.deliveredQuantity)} / {formatNumber(item.quantity)}{item.unit && ` ${item.unit}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {!allItems.length && entries.length > 1 && (
        <div className="mt-1 text-[10px] text-slate-400">
          {entries.length} subscription{entries.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}
