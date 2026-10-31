import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/data/status-badge';
import { formatNumber, getErrorMessage } from '@/lib/utils';
import type { DeliveryBoardEntry, DeliveryBoardStatus, DeliveryItemOutcome } from '@/types/delivery';
import { useDelivery } from '../hooks';
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

export function DeliveryDetailsDrawer({
  entry,
  date,
  onClose,
}: {
  entry: DeliveryBoardEntry;
  date: string;
  onClose: () => void;
}) {
  const recordOutcome = useRecordDeliveryOutcome();
  const deliveryQuery = useDelivery(entry.deliveryId ?? entry.id);
  const [session, setSession] = useState<'morning' | 'evening' | null>(entry.deliverySlot ?? null);
  const serverItems = deliveryQuery.data?.items ?? [];
  const [items, setItems] = useState<DeliveryItemOutcome[]>(() => {
    const fromEntry = (entry.items ?? []).map((it) => ({
      productId: it.productId,
      variantId: it.variantId ?? undefined,
      productName: it.productName,
      variantLabel: it.variantLabel ?? undefined,
      unit: it.unit ?? undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice ?? 0,
      deliveredQuantity: Number(it.itemStatus === 'pending' ? (it.deliveredQuantity ?? it.quantity ?? 0) : (it.deliveredQuantity ?? 0)),
      itemStatus: it.itemStatus,
      failureReason: it.failureReason ?? undefined,
      failureNotes: it.failureNotes ?? undefined,
    }));
    if (fromEntry.length > 0) return fromEntry;
    return [{
      productId: entry.productId ?? entry.id,
      variantId: undefined,
      productName: entry.productName ?? 'Delivery',
      variantLabel: undefined,
      unit: entry.unit ?? undefined,
      quantity: Number(entry.scheduledQuantity ?? entry.quantity ?? 0),
      unitPrice: Number(entry.pricePerPacket ?? 0),
      deliveredQuantity: Number(entry.scheduledQuantity ?? entry.quantity ?? 0),
      itemStatus: entry.deliveryStatus as DeliveryBoardStatus,
      failureReason: undefined,
      failureNotes: undefined,
    }];
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

  // Sync items from server when entry/detail loads
  useEffect(() => {
    if (serverItems.length > 0) {
      setItems(
        serverItems.map((it: any) => ({
          productId: it.productId,
          variantId: it.variantId ?? undefined,
          productName: it.productName,
          variantLabel: it.variantLabel ?? undefined,
          unit: it.unit ?? undefined,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice ?? 0),
          deliveredQuantity: Number(it.itemStatus === 'pending' ? (it.deliveredQuantity ?? it.quantity ?? 0) : (it.deliveredQuantity ?? 0)),
          itemStatus: it.itemStatus,
          failureReason: it.failureReason ?? undefined,
          failureNotes: it.failureNotes ?? undefined,
        })),
      );
    }
  }, [serverItems]);

  const customerName = entry.customerName || 'Unknown customer';
  const phone = entry.phone ?? null;
  const address = entry.address ?? null;

  const handleQtyChange = (productId: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? { ...it, deliveredQuantity: Math.max(0, it.deliveredQuantity + delta) }
          : it,
      ),
    );
  };

  const handleDirectQty = (productId: string, value: string) => {
    const n = Number(value);
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, deliveredQuantity: n >= 0 ? n : 0 } : it)),
    );
  };

  const handleMarkAllDelivered = () => {
    // Prevent delivering an already delivered delivery
    if (isAlreadyDelivered) {
      setError('This delivery has already been completed and cannot be delivered again.');
      return;
    }
    setError(null);
    setItems((prev) => prev.map((it) => ({ ...it, itemStatus: 'delivered' as DeliveryBoardStatus, deliveredQuantity: it.quantity })));
  };

  const handleMarkAllFailed = () => {
    // Prevent failing an already delivered delivery
    if (isAlreadyDelivered) {
      setError('This delivery has already been completed and cannot be failed.');
      return;
    }
    setError(null);
    setItems((prev) => prev.map((it) => ({ ...it, itemStatus: 'failed' as DeliveryBoardStatus, deliveredQuantity: 0 })));
    setFailSectionOpen(true);
  };

  const handleConfirm = async (outcomeId: string) => {
    setError(null);
    setIsSaving(true);
    try {
      const itemsPayload = items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId ?? '',
        productName: it.productName,
        variantLabel: it.variantLabel ?? '',
        unit: it.unit ?? '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        deliveredQuantity: it.deliveredQuantity,
        itemStatus: it.itemStatus,
        failureReason: it.failureReason ?? '',
        failureNotes: it.failureNotes ?? '',
      }));

      const idempotencyKey = `subscription-pending:${entry.subscriptionId}:${date}:${session ?? entry.deliverySlot ?? 'morning'}`;

      const paymentReceivedPayload =
        collectPayment && Number(paymentAmount) > 0
          ? {
              amount: Number(paymentAmount),
              paymentMethod,
            }
          : null;

      await recordOutcome.mutateAsync({
        entry: {
          userId: entry.userId,
          type: entry.type as 'subscription' | 'order',
          subscriptionId: entry.subscriptionId ?? undefined,
          orderId: entry.orderId ?? undefined,
          deliverySlot: session ?? entry.deliverySlot ?? undefined,
          id: entry.id,
          deliveryId: entry.deliveryId ?? undefined,
          scheduledQuantity: entry.scheduledQuantity,
        },
        data: {
          deliveryDate: date,
          status: outcomeId as any,
          actualQuantity: items.reduce((s, it) => s + it.deliveredQuantity, 0) || undefined,
          items: itemsPayload,
          paymentMode: collectPayment ? 'pay_at_delivery' : 'subscription_ledger',
          paymentReceived: paymentReceivedPayload,
          reason: '',
          notes: '',
          idempotencyKey,
          expectedVersion: undefined,
        },
      });
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

  const overallItemStatus: string =
    isAllDelivered ? 'delivered' : hasFailures ? 'failed' : hasPartials ? 'partial' : 'pending';

  const isAlreadyDelivered = overallItemStatus === 'delivered';

  const canConfirm = items.length > 0 && (isAllDelivered || hasPartials || hasFailures) && !isAlreadyDelivered;

  return (
    <div className="lg:w-[440px] max-h-full flex flex-col">
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
            <StatusBadge status={entry.deliveryStatus} className="text-[10px]" />
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
          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-slate-500">
            <Badge variant="outline" className="px-2 py-0.5">{session ?? entry.deliverySlot ?? 'morning'}</Badge>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: overallItemStatus === 'delivered' ? '#10b981' : overallItemStatus === 'failed' ? '#f43f5e' : '#f59e0b' }} />
              {overallItemStatus.charAt(0).toUpperCase() + overallItemStatus.slice(1)}
            </span>
          </div>
        </div>

        {/* ── Products ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Products</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
              <span className="text-xs font-bold text-slate-900">Total: &#8377;{formatNumber(items.reduce((acc, it) => acc + (it.deliveredQuantity || 0) * (it.unitPrice || 0), 0))}</span>
            </div>
          </div>

          <div className="space-y-1">
            {items.map((it) => (
              <div key={it.productId} className="flex min-w-0 items-center justify-between gap-2 px-1.5 py-1 rounded border border-slate-100 bg-slate-50/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-xs text-slate-700">
                    <span className="font-medium truncate flex-1">{it.productName}</span>
                    {it.variantLabel && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{it.variantLabel}</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    {entry.type === 'subscription' ? (
                      <>
                        <span className="font-semibold text-emerald-700">₹{formatNumber(it.unitPrice || 0)}</span>
                        <span className="text-slate-400" aria-hidden="true">|</span>
                        <span className="font-semibold text-slate-700">{formatNumber(it.quantity)} {it.unit}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-700">₹{formatNumber(it.unitPrice || 0)}</span>
                        <span className="text-slate-400" aria-hidden="true">|</span>
                        <span className="font-semibold text-slate-700">{formatNumber(it.quantity)} {it.unit}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">₹{formatNumber((it.deliveredQuantity || 0) * (it.unitPrice || 0))}</span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQtyChange(it.productId, -0.5)}
                      className="h-6 w-6 p-0 text-xs"
                      disabled={it.deliveredQuantity <= 0}
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      value={it.deliveredQuantity}
                      onChange={(e) => handleDirectQty(it.productId, e.target.value)}
                      className="h-5 w-10 text-[10px] text-center text-slate-900"
                      step="0.5"
                      min="0"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQtyChange(it.productId, 0.5)}
                      className="h-6 w-6 p-0 text-xs"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Complete delivery</span>
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
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Failure reason</span>
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
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Notes</span>
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
              onClick={() => handleConfirm(overallItemStatus)}
              disabled={isSaving || !canConfirm}
              className="w-full h-9 text-xs font-semibold disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : `Confirm ${overallItemStatus}`}
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