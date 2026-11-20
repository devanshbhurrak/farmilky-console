import { useState } from 'react';
import { AlertCircle, CheckCircle2, Phone, MapPin, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/data/status-badge';
import { formatNumber, getErrorMessage } from '@/lib/utils';
import type { DeliveryBoardEntry, DeliveryBoardStatus, DeliveryItemOutcome } from '@/types/delivery';
import { useRecordDeliveryOutcome } from '../hooks';
import { DeliveryItemAdder, type AddedExtraItem } from './delivery-item-adder';

const FAILURE_REASONS = [
  { id: 'customer_unavailable', label: 'Customer unavailable' },
  { id: 'customer_skip', label: 'Customer requested skip' },
  { id: 'customer_refused', label: 'Customer refused delivery' },
  { id: 'out_of_stock', label: 'Product out of stock' },
  { id: 'address_access', label: 'Address / access issue' },
  { id: 'damaged_incorrect', label: 'Product damaged / incorrect' },
  { id: 'other', label: 'Other' },
] as const;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export interface DrawerItemOutcome extends DeliveryItemOutcome {
  uniqueItemId: string;
  deliverySlot: 'morning' | 'evening';
  entryRefId: string;
  sourceEntry: DeliveryBoardEntry;
  isExtra?: boolean;
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
      const isPending = (e.deliveryStatus ?? 'pending') === 'pending';

      if (e.items && e.items.length > 0) {
        return e.items.map((it, itemIdx) => {
          const scheduledQty = Number(it.quantity ?? 0);
          const rawItemStatus = it.itemStatus ?? (isPending ? 'pending' : (e.deliveryStatus as DeliveryBoardStatus));
          const isItemDelivered = rawItemStatus === 'delivered';
          const isItemPartial = rawItemStatus === 'partial';
          const isItemFailed = rawItemStatus === 'failed';

          let deliveredQty = scheduledQty;
          if (isItemDelivered) {
            deliveredQty = scheduledQty;
          } else if (isItemPartial) {
            deliveredQty = it.deliveredQuantity != null ? Number(it.deliveredQuantity) : scheduledQty;
          } else if (isItemFailed) {
            deliveredQty = 0;
          } else {
            // pending
            deliveredQty = scheduledQty;
          }

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
            itemStatus: rawItemStatus,
            failureReason: it.failureReason ?? undefined,
            failureNotes: it.failureNotes ?? undefined,
            deliverySlot: slot,
            entryRefId: refId,
            sourceEntry: e,
          };
        });
      }

      const defaultQty = Number(e.scheduledQuantity ?? e.quantity ?? 0);
      const rawStatus = (e.deliveryStatus ?? 'pending') as DeliveryBoardStatus;
      const isDelivered = rawStatus === 'delivered';
      const isFailed = rawStatus === 'failed';
      const isPartial = rawStatus === 'partial';

      let deliveredQty = defaultQty;
      if (isDelivered) {
        deliveredQty = defaultQty;
      } else if (isFailed) {
        deliveredQty = 0;
      } else if (isPartial) {
        deliveredQty = e.actualQuantity != null ? Number(e.actualQuantity) : defaultQty;
      } else {
        deliveredQty = defaultQty;
      }

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
        itemStatus: rawStatus,
        failureReason: undefined,
        failureNotes: undefined,
        deliverySlot: slot,
        entryRefId: refId,
        sourceEntry: e,
      }];
    });
  });

  const [activeFailureItemId, setActiveFailureItemId] = useState<string | null>(null);
  const [globalFailureReason, setGlobalFailureReason] = useState<string | null>(null);
  const [otherNote, setOtherNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery-time payment state
  const [collectPayment, setCollectPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentAmountEdited, setPaymentAmountEdited] = useState(false);

  if (!firstEntry) return null;

  const customerName = firstEntry.customerName || 'Unknown customer';
  const phone = firstEntry.phone ?? null;
  const address = firstEntry.address ?? null;

  const availableSlots = Array.from(
    new Set(activeEntries.map((e) => (e.deliverySlot ?? 'morning') as 'morning' | 'evening')),
  );

  // Extra products stay local until the drawer is confirmed. They are recorded
  // as ad-hoc instant lines for the matching slot so they never modify an
  // already-recorded subscription/order outcome.
  const handleAddExtraItem = (added: AddedExtraItem) => {
    const entryId = `extra-${firstEntry.userId}-${added.slot}`;
    const sourceEntry: DeliveryBoardEntry = {
      id: entryId,
      userId: firstEntry.userId,
      customerName,
      type: 'instant',
      deliverySlot: added.slot,
      deliveryStatus: 'delivered',
      quantity: 0,
    };

    setError(null);
    setItems((prev) => [
      ...prev,
      {
        uniqueItemId: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productId: added.productId,
        variantId: added.variantId,
        productName: added.productName,
        variantLabel: added.variantLabel,
        unit: added.unit ?? undefined,
        quantity: added.quantity,
        unitPrice: added.unitPrice,
        deliveredQuantity: added.quantity,
        itemStatus: 'delivered',
        deliverySlot: added.slot,
        entryRefId: entryId,
        sourceEntry,
        isExtra: true,
      },
    ]);
  };

  const totalDeliveredPrice = round2(
    items.reduce((sum, it) => {
      const chargeable =
        it.itemStatus === 'delivered' || it.itemStatus === 'partial' || it.itemStatus === 'extra';
      return sum + (chargeable ? (it.deliveredQuantity || 0) * (it.unitPrice || 0) : 0);
    }, 0),
  );
  const totalDeliveredQty = items.reduce((sum, it) => {
    const chargeable =
      it.itemStatus === 'delivered' || it.itemStatus === 'partial' || it.itemStatus === 'extra';
    return sum + (chargeable ? (it.deliveredQuantity || 0) : 0);
  }, 0);
  const paymentAmountValue = paymentAmountEdited
    ? paymentAmount
    : (totalDeliveredPrice > 0 ? String(totalDeliveredPrice) : '');

  // Individual item outcome handlers
  const handleDeliverItem = (uniqueItemId: string) => {
    setError(null);
    setItems((prev) =>
      prev.map((it) => {
        if (it.uniqueItemId !== uniqueItemId) return it;
        return {
          ...it,
          itemStatus: 'delivered',
          deliveredQuantity: it.quantity,
          failureReason: undefined,
          failureNotes: undefined,
        };
      }),
    );
    if (activeFailureItemId === uniqueItemId) {
      setActiveFailureItemId(null);
    }
  };

  const handleFailItem = (uniqueItemId: string) => {
    setError(null);
    setItems((prev) =>
      prev.map((it) => {
        if (it.uniqueItemId !== uniqueItemId) return it;
        return {
          ...it,
          itemStatus: 'failed',
          deliveredQuantity: 0,
        };
      }),
    );
    setActiveFailureItemId(uniqueItemId);
  };

  const handleResetItemToPending = (uniqueItemId: string) => {
    setError(null);
    setItems((prev) =>
      prev.map((it) => {
        if (it.uniqueItemId !== uniqueItemId) return it;
        return {
          ...it,
          itemStatus: 'pending',
          deliveredQuantity: it.quantity,
          failureReason: undefined,
          failureNotes: undefined,
        };
      }),
    );
    if (activeFailureItemId === uniqueItemId) {
      setActiveFailureItemId(null);
    }
  };

  const handleSetItemFailureReason = (uniqueItemId: string, reasonId: string, customNote?: string) => {
    const reasonLabel =
      reasonId === 'other'
        ? (customNote?.trim() || 'Other')
        : (FAILURE_REASONS.find((r) => r.id === reasonId)?.label || reasonId);

    setItems((prev) =>
      prev.map((it) => {
        if (it.uniqueItemId !== uniqueItemId) return it;
        return {
          ...it,
          failureReason: reasonLabel,
          failureNotes: customNote || it.failureNotes,
        };
      }),
    );
  };

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

  // Slot-level bulk actions
  // Customer-level all actions
  const handleMarkAllDelivered = () => {
    setError(null);
    setActiveFailureItemId(null);
    setGlobalFailureReason(null);
    setOtherNote('');
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        itemStatus: 'delivered',
        deliveredQuantity: it.quantity,
        failureReason: undefined,
        failureNotes: undefined,
      })),
    );
  };

  const handleMarkAllFailed = () => {
    setError(null);
    if (items.length > 0) {
      setActiveFailureItemId(items[0].uniqueItemId);
    }
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        itemStatus: 'failed',
        deliveredQuantity: 0,
      })),
    );
  };

  const handleConfirm = async () => {
    setError(null);

    // Validate that any failed item has a failure reason
    const unreasonedFailedItem = items.find(
      (it) => it.itemStatus === 'failed' && !it.failureReason && !globalFailureReason,
    );
    if (unreasonedFailedItem) {
      setActiveFailureItemId(unreasonedFailedItem.uniqueItemId);
      setError(`Please select a failure reason for "${unreasonedFailedItem.productName}"`);
      return;
    }

    if (collectPayment) {
      const amount = Number(paymentAmountValue);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Enter a valid payment amount');
        return;
      }
      if (totalDeliveredPrice <= 0) {
        setError('No delivered items to collect payment for');
        return;
      }
    }

    setIsSaving(true);
    try {
      const fallbackReason =
        globalFailureReason === 'other'
          ? (otherNote.trim() || 'Other')
          : (FAILURE_REASONS.find((r) => r.id === globalFailureReason)?.label || globalFailureReason || 'Delivery failed');

      // Extra items have their own synthetic instant source entries, so record
      // them alongside the original entries in the same confirmation pass.
      const extraEntries = Array.from(
        items
          .reduce((map, it) => {
            if (it.isExtra) map.set(it.sourceEntry.id, it.sourceEntry);
            return map;
          }, new Map<string, DeliveryBoardEntry>())
          .values(),
      );
      const entriesToConfirm = [...activeEntries, ...extraEntries];

      // Build each entry's payload first so payment can be allocated once
      // across the whole confirmation instead of being sent to every entry.
      const groups = entriesToConfirm
        .map((e) => {
          const entryItems = items.filter((it) => it.sourceEntry.id === e.id);

          const isAllEntryDelivered = entryItems.every((it) => it.itemStatus === 'delivered');
          const isAllEntryFailed = entryItems.every((it) => it.itemStatus === 'failed');
          const hasEntryDelivered = entryItems.some((it) => it.itemStatus === 'delivered' || it.itemStatus === 'partial');
          const hasEntryPending = entryItems.some((it) => it.itemStatus === 'pending');

          let entryOutcomeStatus: DeliveryBoardStatus = 'pending';
          if (isAllEntryDelivered) {
            entryOutcomeStatus = 'delivered';
          } else if (isAllEntryFailed) {
            entryOutcomeStatus = 'failed';
          } else if (hasEntryDelivered && (hasEntryPending || entryItems.some((it) => it.itemStatus === 'partial' || it.itemStatus === 'failed'))) {
            entryOutcomeStatus = 'partial';
          } else if (!hasEntryDelivered && hasEntryPending) {
            entryOutcomeStatus = 'pending';
          } else {
            entryOutcomeStatus = 'partial';
          }

          const itemsPayload = entryItems.map((it) => {
            const itemStatus = it.itemStatus ?? 'pending';
            const reason = it.failureReason || fallbackReason;
            const itemChargeable =
              itemStatus === 'delivered' || itemStatus === 'partial' || itemStatus === 'extra';
            return {
              productId: it.productId,
              variantId: it.variantId ?? '',
              productName: it.productName,
              variantLabel: it.variantLabel ?? '',
              unit: it.unit ?? '',
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              deliveredQuantity: itemChargeable ? Math.max(0, it.deliveredQuantity) : 0,
              status: itemStatus,
              failureReason: itemStatus === 'failed' ? reason : '',
              failureNotes: itemStatus === 'failed' ? (it.failureNotes || otherNote || '') : '',
            };
          });

          const entryChargeable =
            entryOutcomeStatus === 'delivered' || entryOutcomeStatus === 'partial';
          const entryTotal = entryChargeable
            ? round2(
                itemsPayload.reduce(
                  (sum, it) => sum + (it.deliveredQuantity ?? 0) * it.unitPrice,
                  0,
                ),
              )
            : 0;
          const firstFailedReason =
            entryItems.find((it) => it.itemStatus === 'failed')?.failureReason || fallbackReason;

          return { e, entryItems, entryOutcomeStatus, itemsPayload, entryTotal, firstFailedReason };
        })
        .filter((group) => group.entryItems.length > 0)
        // Do not create a pending instant record when extra lines were left
        // untouched; they should only be saved once actually handled.
        .filter((group) => !(group.e.id.startsWith('extra-') && group.entryOutcomeStatus === 'pending'));

      const requestedPayment = collectPayment ? Number(paymentAmountValue) : 0;
      let paymentRemaining = requestedPayment;
      const paymentByEntry = new Map<string, number>();
      if (paymentRemaining > 0) {
        for (const group of groups) {
          if (group.entryTotal <= 0) continue;
          const allocated = Math.min(paymentRemaining, group.entryTotal);
          if (allocated > 0) {
            paymentByEntry.set(group.e.id, allocated);
            paymentRemaining = round2(paymentRemaining - allocated);
          }
        }
        // If the collected amount exceeds the delivered value, attach the
        // remainder to the last chargeable entry so the full payment is saved.
        if (paymentRemaining > 0) {
          const lastChargeable = [...groups].reverse().find((group) => group.entryTotal > 0);
          if (lastChargeable) {
            paymentByEntry.set(
              lastChargeable.e.id,
              round2((paymentByEntry.get(lastChargeable.e.id) ?? 0) + paymentRemaining),
            );
          }
        }
      }

      for (const { e, entryItems, entryOutcomeStatus, itemsPayload, firstFailedReason } of groups) {
        const isExtraEntry = e.id.startsWith('extra-');
        const refId = e.subscriptionId ?? e.orderId ?? e.id;
        // Stable per reference/date/slot: a double tap or network retry must
        // replay the same result instead of creating a second record/charge.
        // Extra lines use an item fingerprint so adding a different item later
        // still records instead of replaying an older instant outcome.
        let idempotencyKey = `outcome:${e.type ?? 'subscription'}:${refId}:${date}:${e.deliverySlot ?? 'morning'}`;
        if (isExtraEntry) {
          const fingerprint = itemsPayload
            .map((it) =>
              [it.productId, it.variantId ?? '', it.quantity, it.unitPrice, it.deliveredQuantity, it.status].join(':'),
            )
            .join('|');
          let hash = 0;
          for (let i = 0; i < fingerprint.length; i++) {
            hash = (Math.imul(31, hash) + fingerprint.charCodeAt(i)) | 0;
          }
          idempotencyKey = `outcome:instant:${e.id}:${date}:${(hash >>> 0).toString(36)}`;
        }

        const entryPayment = paymentByEntry.get(e.id) ?? 0;
        const paymentReceivedPayload =
          entryPayment > 0
            ? {
                amount: entryPayment,
                paymentMethod,
              }
            : null;

        await recordOutcome.mutateAsync({
          entry: {
            userId: e.userId,
            type: e.type as 'subscription' | 'order' | 'instant',
            subscriptionId: isExtraEntry ? undefined : (e.subscriptionId ?? undefined),
            orderId: isExtraEntry ? undefined : (e.orderId ?? undefined),
            deliverySlot: e.deliverySlot ?? undefined,
            id: e.id,
            deliveryId: isExtraEntry ? undefined : (e.deliveryId ?? undefined),
            scheduledQuantity: isExtraEntry ? undefined : e.scheduledQuantity,
          },
          data: {
            deliveryDate: date,
            slot: e.deliverySlot as 'morning' | 'evening' | undefined,
            status: entryOutcomeStatus as any,
            actualQuantity: entryItems.reduce((sum, it) => {
              const chargeable =
                it.itemStatus === 'delivered' || it.itemStatus === 'partial' || it.itemStatus === 'extra';
              return sum + (chargeable ? it.deliveredQuantity : 0);
            }, 0),
            items: itemsPayload,
            paymentMode:
              isExtraEntry || collectPayment ? 'pay_at_delivery' : 'subscription_ledger',
            paymentReceived: paymentReceivedPayload,
            reason: ((entryOutcomeStatus as string) === 'failed' || (entryOutcomeStatus as string) === 'skipped') ? firstFailedReason : undefined,
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

  const isAllDelivered = items.length > 0 && items.every((it) => it.itemStatus === 'delivered');
  const isAllFailed = items.length > 0 && items.every((it) => it.itemStatus === 'failed');
  const hasDelivered = items.some((it) => it.itemStatus === 'delivered' || it.itemStatus === 'partial');

  const overallStatus =
    isAllDelivered
      ? 'delivered'
      : isAllFailed
        ? 'failed'
        : (hasDelivered || items.some((it) => it.itemStatus === 'partial'))
          ? 'partial'
          : 'pending';

  // Can confirm if at least one item has been confirmed (delivered, failed, or partial)
  const hasAnyHandled = items.some((it) => it.itemStatus !== 'pending');
  const canConfirm = items.length > 0 && (hasAnyHandled || isAllDelivered || isAllFailed);

  // Group items by slot for clear slot-wise separation
  const morningItems = items.filter((it) => it.deliverySlot === 'morning');
  const eveningItems = items.filter((it) => it.deliverySlot === 'evening');
  const activeSlotGroups = [
    { label: 'Morning Delivery', slot: 'morning' as const, slotItems: morningItems, badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
    { label: 'Evening Delivery', slot: 'evening' as const, slotItems: eveningItems, badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  ].filter((group) => group.slotItems.length > 0);

  return (
    <div className="w-full max-w-full lg:w-[480px] h-[88dvh] lg:h-full flex flex-col min-h-0 overflow-hidden box-border">
      <SheetHeader className="pb-2 shrink-0">
        <SheetTitle className="text-sm font-semibold">Delivery details & confirmation</SheetTitle>
      </SheetHeader>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 p-3 pb-8">
        {/* ── Customer info header ────────────────────────────── */}
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
                    overallStatus === 'delivered' ? '#10b981' : overallStatus === 'failed' ? '#f43f5e' : overallStatus === 'partial' ? '#f59e0b' : '#94a3b8',
                }}
              />
              {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
            </span>
          </div>
        </div>

        {/* ── Products Grouped by Delivery Slot ────────────────── */}
        <div className="space-y-3">
          {activeSlotGroups.map((group) => {
              const slotStatus = group.slotItems.every((it) => it.itemStatus === 'delivered')
                ? 'delivered'
                : group.slotItems.every((it) => it.itemStatus === 'failed')
                  ? 'failed'
                  : group.slotItems.some((it) => it.itemStatus === 'delivered' || it.itemStatus === 'partial')
                    ? 'partial'
                    : 'pending';

              return (
                <div key={group.slot} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                  {/* Slot Header */}
                  <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${group.badgeClass}`}>
                        {group.label}
                      </span>
                    </div>
                    <StatusBadge status={slotStatus} className="text-[9px] px-1.5 py-0" />
                  </div>

                  {/* Slot Items */}
                  <div className="space-y-2">
                    {group.slotItems.map((it) => {
                      const isItemFailed = it.itemStatus === 'failed';
                      const isItemDelivered = it.itemStatus === 'delivered';
                      const isItemPartial = it.itemStatus === 'partial';
                      const isItemPending = it.itemStatus === 'pending' || !it.itemStatus;
                      const isEditingFailure = activeFailureItemId === it.uniqueItemId;

                      return (
                        <div
                          key={it.uniqueItemId}
                          className={`flex flex-col gap-1.5 p-2 rounded-lg border transition-all ${
                            isItemDelivered
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : isItemFailed
                                ? 'border-rose-200 bg-rose-50/50'
                                : isItemPartial
                                  ? 'border-amber-200 bg-amber-50/50'
                                  : 'border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          {/* ── Product Header Info ── */}
                          <div className="flex min-w-0 items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-xs text-slate-900">{it.productName}</span>
                                {it.variantLabel && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal border-slate-300 text-slate-600 bg-white">
                                    {it.variantLabel}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                <span className="font-medium text-emerald-700">₹{formatNumber(it.unitPrice || 0)} <span className="text-[9px] text-slate-400 font-normal">/ unit</span></span>
                                <span className="text-slate-300">·</span>
                                <span>Scheduled: <strong className="text-slate-700 font-semibold">{formatNumber(it.quantity)} {it.unit ?? ''}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* ── Action Bar: Status Selector & Quantity/Total ── */}
                          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200/70">
                            {/* Segmented Status Toggle */}
                            <div className="grid grid-cols-3 rounded p-0.5 bg-slate-200/80 border border-slate-300/60 shadow-inner w-full">
                              <button
                                type="button"
                                onClick={() => handleDeliverItem(it.uniqueItemId)}
                                className={`py-0.5 text-[10px] font-semibold rounded transition-all flex items-center justify-center gap-1 ${
                                  isItemDelivered
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
                                }`}
                              >
                                <Check className="size-3 stroke-[2.5]" /> Delivered
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFailItem(it.uniqueItemId)}
                                className={`py-0.5 text-[10px] font-semibold rounded transition-all flex items-center justify-center gap-1 ${
                                  isItemFailed
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
                                }`}
                              >
                                <X className="size-3 stroke-[2.5]" /> Failed
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetItemToPending(it.uniqueItemId)}
                                className={`py-0.5 text-[10px] font-medium rounded transition-all flex items-center justify-center gap-1 ${
                                  isItemPending
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                }`}
                              >
                                <RotateCcw className="size-2.5" /> Pending
                              </button>
                            </div>

                            {/* Quantity Controls & Line Total (Active when not failed) */}
                            {!isItemFailed ? (
                              <div className="flex items-center justify-between gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-200/80 w-full">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight shrink-0">Qty:</span>
                                  <div className="flex items-center rounded border border-slate-300 bg-white shadow-2xs overflow-hidden shrink-0">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleQtyChange(it.uniqueItemId, -0.5)}
                                      className="h-5 w-4.5 p-0 rounded-none text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold"
                                      disabled={it.deliveredQuantity <= 0}
                                    >
                                      −
                                    </Button>
                                    <Input
                                      type="number"
                                      value={it.deliveredQuantity}
                                      onChange={(e) => handleDirectQty(it.uniqueItemId, e.target.value)}
                                      className="h-5 w-6 border-0 border-x border-slate-200 text-[10px] text-center text-slate-900 font-bold px-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-slate-50/50"
                                      step="0.5"
                                      min="0"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleQtyChange(it.uniqueItemId, 0.5)}
                                      className="h-5 w-4.5 p-0 rounded-none text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold"
                                    >
                                      +
                                    </Button>
                                  </div>
                                  <span className="text-[10px] text-slate-500 shrink-0">{it.unit ?? ''}</span>
                                </div>

                                <div className="flex items-baseline gap-1 pl-2 border-l border-slate-200 shrink-0 text-right ml-auto">
                                  <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">Total:</span>
                                  <span className="text-xs font-extrabold font-mono tabular-nums text-slate-900">
                                    ₹{formatNumber((it.deliveredQuantity || 0) * (it.unitPrice || 0))}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-right text-[10px] text-rose-600 font-medium italic">
                                Delivery marked as failed (₹0)
                              </div>
                            )}
                          </div>

                          {/* Failure Reason Selector for this item */}
                          {isItemFailed && (
                            <div className="mt-1 p-2 rounded-lg bg-rose-50 border border-rose-200/80 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-rose-900">
                                  Failure reason: <span className="font-normal underline underline-offset-2">{it.failureReason || 'Not selected'}</span>
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setActiveFailureItemId(isEditingFailure ? null : it.uniqueItemId)}
                                  className="h-5 px-1.5 text-[9px] text-rose-700 hover:bg-rose-100"
                                >
                                  {isEditingFailure ? 'Hide options' : 'Change reason'}
                                </Button>
                              </div>

                              {(isEditingFailure || !it.failureReason) && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="grid grid-cols-2 gap-1">
                                    {FAILURE_REASONS.map((r) => {
                                      const isSelected = it.failureReason === r.label || (r.id === 'other' && it.failureReason === otherNote);
                                      return (
                                        <Button
                                          key={r.id}
                                          type="button"
                                          variant={isSelected ? 'default' : 'outline'}
                                          size="sm"
                                          onClick={() => handleSetItemFailureReason(it.uniqueItemId, r.id, otherNote)}
                                          className={`h-7 px-1.5 text-[9px] leading-tight text-center truncate ${
                                            isSelected ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-white'
                                          }`}
                                        >
                                          {r.label}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                  <Input
                                    value={otherNote}
                                    onChange={(e) => {
                                      setOtherNote(e.target.value);
                                      handleSetItemFailureReason(it.uniqueItemId, 'other', e.target.value);
                                    }}
                                    placeholder="Optional note / custom reason..."
                                    className="h-6 text-[10px] bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {/* ── Instant extra item at delivery ─────────────────── */}
        <DeliveryItemAdder
          key={firstEntry.userId}
          customerName={customerName}
          slots={availableSlots.length > 0 ? availableSlots : ['morning']}
          defaultSlot={(firstEntry.deliverySlot ?? 'morning') as 'morning' | 'evening'}
          onAdd={handleAddExtraItem}
        />

        {/* ── Summary & Actions ─────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-2.5">
          {/* Total Price Summary Bar */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
            <div>
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                Total Order Value
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                {totalDeliveredQty > 0
                  ? `${formatNumber(totalDeliveredQty)} units delivering`
                  : 'No units marked as delivering'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold font-mono tabular-nums text-emerald-950">
                ₹{formatNumber(totalDeliveredPrice)}
              </span>
            </div>
          </div>

          {/* Quick All-Items Actions (only shown when there are multiple items) */}
          {items.length > 1 && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <Button
                type="button"
                variant={isAllDelivered ? 'default' : 'outline'}
                size="sm"
                onClick={handleMarkAllDelivered}
                disabled={isSaving}
                className="h-8 text-[11px] font-medium"
              >
                <CheckCircle2 className="mr-1 size-3.5 text-emerald-600" aria-hidden="true" />
                Deliver all
              </Button>
              <Button
                type="button"
                variant={isAllFailed ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleMarkAllFailed}
                disabled={isSaving}
                className="h-8 text-[11px] font-medium"
              >
                <AlertCircle className="mr-1 size-3.5 text-rose-600" aria-hidden="true" />
                Fail all
              </Button>
            </div>
          )}

          {/* ── Spot Payment Section (When delivering) ──────────────── */}
          {hasDelivered && (
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={collectPayment}
                    onChange={(e) => {
                      setCollectPayment(e.target.checked);
                      if (!e.target.checked) {
                        setPaymentAmount('');
                        setPaymentAmountEdited(false);
                      }
                      setError(null);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    aria-label="Collect payment on the spot"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-800">Payment collected</span>
                    <span className="block text-[10px] text-slate-500">Collect payment on the spot</span>
                  </span>
                </label>
                {collectPayment && (
                  <div className="relative shrink-0">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmountValue}
                      onChange={(e) => {
                        setPaymentAmount(e.target.value);
                        setPaymentAmountEdited(true);
                      }}
                      placeholder="Amount"
                      aria-label="Amount collected"
                      className="h-8 w-28 pl-5 text-right text-xs font-semibold text-slate-900 bg-white"
                    />
                  </div>
                )}
              </div>

              {collectPayment && (
                <div className="mt-2.5 p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <label className="text-[10px] font-semibold text-emerald-900 block mb-1">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'upi')}
                    className="w-full h-8 text-xs rounded border border-emerald-200 bg-white px-2 text-slate-900"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="mt-3">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || !canConfirm}
              className="w-full h-9 text-xs font-semibold disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : `Confirm (${overallStatus})`}
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
