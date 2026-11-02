import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/data/status-badge';
import { formatNumber, getErrorMessage } from '@/lib/utils';
import type { DeliveryBoardEntry, DeliveryBoardStatus, DeliveryItemOutcome } from '@/types/delivery';
import { useRecordDeliveryOutcome } from '../hooks';

const FAILURE_REASONS = [
  { id: 'customer_unavailable', label: 'Customer unavailable' },
  { id: 'customer_skip', label: 'Customer requested skip' },
  { id: 'customer_refused', label: 'Customer refused delivery' },
  { id: 'out_of_stock', label: 'Product out of stock' },
  { id: 'address_access', label: 'Address / access issue' },
  { id: 'damaged_incorrect', label: 'Product damaged / incorrect' },
  { id: 'other', label: 'Other' },
] as const;

export interface DrawerItemOutcome extends DeliveryItemOutcome {
  uniqueItemId: string;
  deliverySlot: 'morning' | 'evening';
  entryRefId: string;
  sourceEntry: DeliveryBoardEntry;
}

export function DeliveryDetailsDrawer({
  entry,
  entries,
  date,
  onClose,
}: {
  entry?: DeliveryBoardEntry;
  entries?: DeliveryBoardEntry[];
  date: string;
  onClose: () => void;
}) {
  const activeEntries = (entries && entries.length > 0) ? entries : (entry ? [entry] : []);
  const firstEntry = activeEntries[0];
  const recordOutcome = useRecordDeliveryOutcome();

  const [items, setItems] = useState<DrawerItemOutcome[]>(() => {
    return activeEntries.flatMap((e, entryIdx) => {
      const slot = (e.deliverySlot ?? 'morning') as 'morning' | 'evening';
      const refId = e.subscriptionId ?? e.orderId ?? e.id;
      const isPending = e.deliveryStatus === 'pending';

      if (e.items && e.items.length > 0) {
        return e.items.map((it, itemIdx) => {
          const scheduledQty = Number(it.quantity ?? 0);
          const itemPending = it.itemStatus === 'pending' || isPending;
          const deliveredQty = itemPending
            ? (it.deliveredQuantity && it.deliveredQuantity > 0 ? Number(it.deliveredQuantity) : scheduledQty)
            : Number(it.deliveredQuantity ?? 0);

          return {
            uniqueItemId: `${e.id}-${it.productId}-${itemIdx}`,
            productId: it.productId,
            variantId: it.variantId ?? undefined,
            productName: it.productName,
            variantLabel: it.variantLabel ?? undefined,
            unit: it.unit ?? undefined,
            quantity: scheduledQty,
            unitPrice: it.unitPrice ?? 0,
            deliveredQuantity: deliveredQty,
            itemStatus: it.itemStatus,
            failureReason: it.failureReason ?? undefined,
            failureNotes: it.failureNotes ?? undefined,
            deliverySlot: slot,
            entryRefId: refId,
            sourceEntry: e,
          };
        });
      }

      const defaultQty = Number(e.scheduledQuantity ?? e.quantity ?? 0);
      const deliveredQty = isPending ? defaultQty : Number(e.actualQuantity ?? 0);

      return [{
        uniqueItemId: `${e.id}-${e.productId ?? e.id}-${entryIdx}`,
        productId: e.productId ?? e.id,
        variantId: undefined,
        productName: e.productName ?? 'Delivery',
        variantLabel: undefined,
        unit: e.unit ?? undefined,
        quantity: defaultQty,
        unitPrice: Number(e.pricePerPacket ?? 0),
        deliveredQuantity: deliveredQty,
        itemStatus: e.deliveryStatus as DeliveryBoardStatus,
        failureReason: undefined,
        failureNotes: undefined,
        deliverySlot: slot,
        entryRefId: refId,
        sourceEntry: e,
      }];
    });
  });

  const [failSectionOpen, setFailSectionOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherNote, setOtherNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery-time payment state
  const [collectPayment, setCollectPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  if (!firstEntry) return null;

  const customerName = firstEntry.customerName || 'Unknown customer';
  const phone = firstEntry.phone ?? null;
  const address = firstEntry.address ?? null;

  const handleQtyChange = (uniqueItemId: string, delta: number) => {
    setError(null);
    setItems((prev) =>
      prev.map((it) => {
        if (it.uniqueItemId !== uniqueItemId) return it;
        const newDelivered = Math.max(0, it.deliveredQuantity + delta);
        const itemStatus: DeliveryBoardStatus =
          newDelivered === 0
            ? 'failed'
            : newDelivered < it.quantity
              ? 'partial'
              : 'delivered';
        return {
          ...it,
          deliveredQuantity: newDelivered,
          itemStatus,
        };
      }),
    );
  };

  const handleDirectQty = (uniqueItemId: string, value: string) => {
    setError(null);
    const n = Number(value);
    setItems((prev) =>
      prev.map((it) => {
        if (it.uniqueItemId !== uniqueItemId) return it;
        const newDelivered = n >= 0 ? n : 0;
        const itemStatus: DeliveryBoardStatus =
          newDelivered === 0
            ? 'failed'
            : newDelivered < it.quantity
              ? 'partial'
              : 'delivered';
        return {
          ...it,
          deliveredQuantity: newDelivered,
          itemStatus,
        };
      }),
    );
  };

  const handleMarkAllDelivered = () => {
    if (isAlreadyDelivered) {
      setError('All deliveries for this customer have already been completed.');
      return;
    }
    setError(null);
    setSelectedReason(null);
    setOtherNote('');
    setFailSectionOpen(false);
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        itemStatus: 'delivered' as DeliveryBoardStatus,
        deliveredQuantity: it.quantity,
        failureReason: undefined,
        failureNotes: undefined,
      })),
    );
  };

  const handleMarkAllFailed = () => {
    if (isAlreadyDelivered) {
      setError('All deliveries for this customer have already been completed and cannot be failed.');
      return;
    }
    setError(null);
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        itemStatus: 'failed' as DeliveryBoardStatus,
        deliveredQuantity: 0,
        failureReason: selectedReason || it.failureReason,
        failureNotes: otherNote || it.failureNotes,
      })),
    );
    setFailSectionOpen(true);
  };

  const handleConfirm = async () => {
    setError(null);

    const isAnyFailed = items.some((it) => it.itemStatus === 'failed');
    if (isAnyFailed) {
      const reasonToUse =
        selectedReason === 'other'
          ? (otherNote.trim() || 'Other')
          : (FAILURE_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason);

      if (!reasonToUse) {
        setError('Please select a failure reason before confirming.');
        setFailSectionOpen(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      const resolvedReason =
        selectedReason === 'other'
          ? (otherNote.trim() || 'Other')
          : (FAILURE_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason || '');

      // Group items by source entry so we record each delivery accurately
      for (const e of activeEntries) {
        const entryItems = items.filter((it) => it.sourceEntry.id === e.id);
        if (entryItems.length === 0) continue;

        const isAllEntryDelivered = entryItems.every((it) => it.itemStatus === 'delivered');
        const hasEntryFailures = entryItems.some((it) => it.itemStatus === 'failed');
        const hasEntryPartials = entryItems.some((it) => it.itemStatus === 'partial');

        const entryOutcomeStatus =
          isAllEntryDelivered ? 'delivered' : hasEntryFailures ? 'failed' : hasEntryPartials ? 'partial' : 'pending';

        const itemsPayload = entryItems.map((it) => ({
          productId: it.productId,
          variantId: it.variantId ?? '',
          productName: it.productName,
          variantLabel: it.variantLabel ?? '',
          unit: it.unit ?? '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          deliveredQuantity: it.deliveredQuantity,
          itemStatus: it.itemStatus,
          failureReason: it.itemStatus === 'failed' ? (it.failureReason || resolvedReason) : '',
          failureNotes: it.itemStatus === 'failed' ? (it.failureNotes || otherNote || '') : '',
        }));

        const refId = e.subscriptionId ?? e.orderId ?? e.id;
        const idempotencyKey = `outcome:${e.type ?? 'subscription'}:${refId}:${date}:${e.deliverySlot ?? 'morning'}:${entryOutcomeStatus}`;

        const paymentReceivedPayload =
          collectPayment && Number(paymentAmount) > 0
            ? {
                amount: Number(paymentAmount),
                paymentMethod,
              }
            : null;

        await recordOutcome.mutateAsync({
          entry: {
            userId: e.userId,
            type: e.type as 'subscription' | 'order',
            subscriptionId: e.subscriptionId ?? undefined,
            orderId: e.orderId ?? undefined,
            deliverySlot: e.deliverySlot ?? undefined,
            id: e.id,
            deliveryId: e.deliveryId ?? undefined,
            scheduledQuantity: e.scheduledQuantity,
          },
          data: {
            deliveryDate: date,
            status: entryOutcomeStatus as any,
            actualQuantity: entryItems.reduce((s, it) => s + it.deliveredQuantity, 0),
            items: itemsPayload,
            paymentMode: collectPayment ? 'pay_at_delivery' : 'subscription_ledger',
            paymentReceived: paymentReceivedPayload,
            reason: resolvedReason,
            notes: otherNote || '',
            idempotencyKey,
            expectedVersion: undefined,
          },
        });
      }

      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const isAllDelivered = items.every((it) => it.itemStatus === 'delivered');
  const hasFailures = items.some((it) => it.itemStatus === 'failed');
  const hasPartials = items.some((it) => it.itemStatus === 'partial');

  const overallStatus =
    isAllDelivered ? 'delivered' : hasFailures ? 'failed' : hasPartials ? 'partial' : 'pending';

  const isAlreadyDelivered = activeEntries.every(
    (e) => (e.deliveryStatus ?? '').toLowerCase() === 'delivered' || (e.deliveryStatus ?? '').toLowerCase() === 'skipped',
  );

  const canConfirm = items.length > 0 && (isAllDelivered || hasPartials || hasFailures) && !isAlreadyDelivered;

  // Group items by slot for crystal-clear slot-wise separation
  const morningItems = items.filter((it) => it.deliverySlot === 'morning');
  const eveningItems = items.filter((it) => it.deliverySlot === 'evening');

  return (
    <div className="lg:w-[460px] max-h-full flex flex-col">
      <SheetHeader className="pb-2">
        <SheetTitle className="text-sm font-semibold">Delivery details</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {/* ── Customer info ────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex min-w-0 items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Customer</span>
              <h3 className="text-sm font-semibold text-slate-900 leading-tight">{customerName}</h3>
            </div>
            <StatusBadge status={overallStatus} className="text-[10px]" />
          </div>
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
              <Phone className="size-3.5" aria-hidden="true" />
              <span className="font-medium">{phone}</span>
            </a>
          )}
          {address && (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
              <MapPin className="size-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span className="leading-relaxed">{address}</span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[10px] font-medium text-slate-500">
            {morningItems.length > 0 && (
              <Badge variant="outline" className="px-2 py-0.5 border-amber-200 text-amber-800 bg-amber-50">
                Morning ({morningItems.length})
              </Badge>
            )}
            {eveningItems.length > 0 && (
              <Badge variant="outline" className="px-2 py-0.5 border-indigo-200 text-indigo-800 bg-indigo-50">
                Evening ({eveningItems.length})
              </Badge>
            )}
            <span className="flex items-center gap-1 ml-auto font-medium">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    overallStatus === 'delivered' ? '#10b981' : overallStatus === 'failed' ? '#f43f5e' : '#f59e0b',
                }}
              />
              {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
            </span>
          </div>
        </div>

        {/* ── Products Grouped by Delivery Slot ────────────────── */}
        <div className="space-y-3">
          {[
            { label: 'Morning Delivery', slot: 'morning' as const, slotItems: morningItems, badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
            { label: 'Evening Delivery', slot: 'evening' as const, slotItems: eveningItems, badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
          ]
            .filter((group) => group.slotItems.length > 0)
            .map((group) => {
              const groupTotal = group.slotItems.reduce(
                (acc, it) => acc + (it.deliveredQuantity || 0) * (it.unitPrice || 0),
                0,
              );
              return (
                <div key={group.slot} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${group.badgeClass}`}>
                        {group.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {group.slotItems.length} product{group.slotItems.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      ₹{formatNumber(groupTotal)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.slotItems.map((it) => (
                      <div
                        key={it.uniqueItemId}
                        className="flex min-w-0 items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-slate-100 bg-slate-50/70"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800">
                            <span className="font-semibold truncate flex-1">{it.productName}</span>
                            {it.variantLabel && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                                {it.variantLabel}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-emerald-700">₹{formatNumber(it.unitPrice || 0)}</span>
                            <span className="text-slate-300" aria-hidden="true">|</span>
                            <span>Scheduled: <strong className="text-slate-700">{formatNumber(it.quantity)} {it.unit ?? ''}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 min-w-10 text-right">
                            ₹{formatNumber((it.deliveredQuantity || 0) * (it.unitPrice || 0))}
                          </span>
                          <div className="flex items-center gap-1 ml-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQtyChange(it.uniqueItemId, -0.5)}
                              className="h-6 w-6 p-0 text-xs font-semibold"
                              disabled={it.deliveredQuantity <= 0}
                            >
                              −
                            </Button>
                            <Input
                              type="number"
                              value={it.deliveredQuantity}
                              onChange={(e) => handleDirectQty(it.uniqueItemId, e.target.value)}
                              className="h-6 w-11 text-[11px] text-center text-slate-900 font-medium px-0.5"
                              step="0.5"
                              min="0"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQtyChange(it.uniqueItemId, 0.5)}
                              className="h-6 w-6 p-0 text-xs font-semibold"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant={isAllDelivered ? 'default' : 'outline'}
              size="sm"
              onClick={handleMarkAllDelivered}
              disabled={isSaving}
              className="h-9 text-xs font-medium"
            >
              <CheckCircle2 className="mr-1 size-3.5" aria-hidden="true" />
              Deliver all
            </Button>
            <Button
              variant={hasFailures ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => {
                handleMarkAllFailed();
                setFailSectionOpen(true);
              }}
              disabled={isSaving || isAlreadyDelivered}
              className="h-9 text-xs font-medium"
            >
              <AlertCircle className="mr-1 size-3.5" aria-hidden="true" />
              Fail
            </Button>
          </div>

          {failSectionOpen && (
            <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Failure reason
              </span>
              <div className="grid grid-cols-2 gap-2">
                {FAILURE_REASONS.map((r) => (
                  <Button
                    key={r.id}
                    variant={selectedReason === r.id ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setSelectedReason(r.id);
                      setItems((prev) =>
                        prev.map((i) => ({ ...i, failureReason: r.id, itemStatus: 'failed' as DeliveryBoardStatus })),
                      );
                    }}
                    className="h-9 px-2 py-1 text-[10px] leading-tight text-center min-w-0"
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
              {selectedReason === 'other' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                    Notes
                  </span>
                  <Input
                    value={otherNote}
                    onChange={(e) => setOtherNote(e.target.value)}
                    placeholder="Explain the failure..."
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Spot Payment Section (When delivering) ──────────────── */}
          {(isAllDelivered || hasPartials) && (
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800">Payment collected</span>
                  <p className="text-[10px] text-slate-500">Collect payment on the spot</p>
                </div>
                <input
                  type="checkbox"
                  checked={collectPayment}
                  onChange={(e) => {
                    setCollectPayment(e.target.checked);
                    if (e.target.checked && !paymentAmount) {
                      const estimated = items.reduce(
                        (sum, it) => sum + (it.deliveredQuantity || it.quantity) * (it.unitPrice || 0),
                        0,
                      );
                      setPaymentAmount(estimated > 0 ? String(estimated) : '');
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {collectPayment && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <div>
                    <label className="text-[10px] font-semibold text-emerald-900 block mb-1">Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full h-8 text-xs rounded border border-emerald-200 bg-white px-2 text-slate-900"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-emerald-900 block mb-1">Amount (₹)</label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Amount"
                      className="h-8 text-xs bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-3">
            <Button
              onClick={handleConfirm}
              disabled={isSaving || !canConfirm}
              className="w-full h-9 text-xs font-semibold disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : `Confirm ${overallStatus}`}
            </Button>
            {error && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
