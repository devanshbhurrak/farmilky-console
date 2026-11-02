import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/form/form-field';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { formatCurrency, formatDate, titleCase } from '@/lib/utils';
import { WEEK_DAYS } from '@/types/subscription';
import type { DeliverySlot } from '@/types/subscription';
import { useCancelScheduleChange, useScheduleChange } from '../hooks';
import { slotConfigOf } from '../api';
import type { SubscriptionDetail } from '../api';
import { CalendarClock, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';

export function ScheduleConfig({
  subscription,
  hidePendingRow = false,
}: {
  subscription: SubscriptionDetail;
  /** Hide the inline pending-change row — the parent renders its own banner. */
  hidePendingRow?: boolean;
}) {
  const slotConfig = slotConfigOf(subscription);
  const isMultiSlot = slotConfig.length > 1;
  const [effectiveDate, setEffectiveDate] = useState('');
  const [newSchedule, setNewSchedule] = useState(subscription.deliverySchedule);
  const [newQty, setNewQty] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSlot, setNewSlot] = useState<DeliverySlot>(slotConfig[0]?.slot ?? 'morning');
  const [customDays, setCustomDays] = useState(subscription.customDays ?? []);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const scheduleChange = useScheduleChange();
  const cancelChange = useCancelScheduleChange();

  const pending =
    subscription.pendingScheduleChange ??
    subscription.pendingChange ??
    (subscription.scheduledChangeDate
      ? {
          effectiveDate: subscription.scheduledChangeDate,
          scheduledQty: subscription.scheduledQty ?? undefined,
          scheduledPrice: subscription.scheduledPrice ?? undefined,
          deliverySchedule: subscription.scheduledDeliverySchedule ?? undefined,
          customDays: subscription.scheduledCustomDays ?? undefined,
          slot: subscription.scheduledSlot ?? undefined,
        }
      : null);
  const subId =
    (typeof subscription.id === 'string' && subscription.id) ||
    (typeof (subscription as { _id?: unknown })._id === 'string'
      ? ((subscription as { _id?: string })._id as string)
      : '');

  const daysChanged =
    newSchedule === 'custom' &&
    (customDays.length !== (subscription.customDays ?? []).length ||
      customDays.some((day) => !(subscription.customDays ?? []).includes(day)));
  const scheduleChanged = newSchedule !== subscription.deliverySchedule || daysChanged;
  const quantity = newQty === '' ? undefined : Number(newQty);
  const price = newPrice === '' ? undefined : Number(newPrice);
  const hasChanges = quantity !== undefined || price !== undefined || scheduleChanged;

  const submit = () => {
    if (!effectiveDate || !hasChanges) return;
    scheduleChange.mutate(
      {
        id: subId,
        data: {
          effectiveDate,
          deliverySchedule: scheduleChanged ? newSchedule : undefined,
          customDays: scheduleChanged && newSchedule === 'custom' ? customDays : undefined,
          scheduledQty: quantity,
          scheduledPrice: price,
          slot: isMultiSlot && quantity !== undefined ? newSlot : undefined,
        },
      },
      {
        onSuccess: () => {
          setEffectiveDate('');
          setNewQty('');
          setNewPrice('');
        },
      },
    );
  };

  const minEffectiveDate = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  })();

  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <CardTitle className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
          <CalendarClock className="size-3.5 text-slate-500" /> Future Schedule Change
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 text-sm">
        {/* Current summary chip */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-xs">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Current Plan:</span>
          <Badge variant="secondary" className="font-semibold">
            {titleCase(subscription.deliverySchedule)}
          </Badge>
          <span className="font-medium text-slate-800">
            {isMultiSlot
              ? slotConfig
                  .map((s) => `${s.quantityPerDelivery} ${s.slot === 'morning' ? 'AM' : 'PM'}`)
                  .join(' + ')
              : `${subscription.quantityPerDelivery ?? subscription.quantityPerDay}/delivery · ${
                  (subscription.deliverySlot ?? subscription.slot) === 'evening' ? 'Evening' : 'Morning'
                }`}
          </span>
        </div>

        {/* Pending Banner if any */}
        {pending && !hidePendingRow && (
          <div className="flex flex-col gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                <AlertCircle className="size-3.5 text-amber-600" /> Pending Change Scheduled
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-600 hover:bg-red-100 hover:text-red-700 p-1.5"
                onClick={() => setConfirmCancel(true)}
              >
                <Trash2 className="size-3 mr-1" /> Cancel
              </Button>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {pending.deliverySchedule ? (
                <span>Schedule: <strong className="font-semibold text-slate-900">{titleCase(pending.deliverySchedule)}</strong> </span>
              ) : null}
              {(pending.scheduledQty ?? pending.quantityPerDay ?? pending.quantityPerDelivery) != null ? (
                <span>
                  · Qty: <strong className="font-semibold text-slate-900">{pending.scheduledQty ?? pending.quantityPerDay ?? pending.quantityPerDelivery} {pending.slot ? titleCase(pending.slot) : ''}</strong>
                </span>
              ) : null}
              {pending.scheduledPrice != null ? (
                <span> · Rate: <strong className="font-semibold text-slate-900">{formatCurrency(pending.scheduledPrice)}</strong></span>
              ) : null}
              {pending.customDays && pending.customDays.length > 0 ? (
                <span> · Days: {pending.customDays.join(', ')}</span>
              ) : null}
              {pending.effectiveDate ? (
                <span className="block mt-1 font-semibold text-amber-900">
                  Effective from: {formatDate(pending.effectiveDate)}
                </span>
              ) : null}
            </p>
          </div>
        )}

        {/* Change form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <FormField label="Effective Date" required>
            <Input
              type="date"
              min={minEffectiveDate}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </FormField>
          <FormField label="New Schedule">
            <Select
              value={newSchedule}
              onChange={(e) => setNewSchedule(e.target.value as 'daily' | 'custom' | 'alternate' | 'weekly')}
            >
              <option value="daily">Daily</option>
              <option value="alternate">Alternate Days</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </Select>
          </FormField>
          <FormField label={isMultiSlot ? 'New Qty' : 'New Qty / Delivery'}>
            <Input
              type="number"
              min={0.001}
              step={0.001}
              placeholder="Leave blank to keep current"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
            />
          </FormField>
          <FormField label="New Price / Unit">
            <Input
              type="number"
              min={0.01}
              step={0.01}
              placeholder="Leave blank to keep current"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </FormField>
          {isMultiSlot && (
            <FormField label="Target Slot" required className="sm:col-span-2">
              <Select value={newSlot} onChange={(e) => setNewSlot(e.target.value as DeliverySlot)}>
                {slotConfig.map((s) => (
                  <option key={s.slot} value={s.slot}>
                    {s.slot === 'morning' ? 'Morning Slot' : 'Evening Slot'}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        {newSchedule === 'custom' && (
          <FormField label="Custom Days" required hint="Select at least one delivery day">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {WEEK_DAYS.map((day) => {
                const active = customDays.includes(day);
                return (
                  <label
                    key={day}
                    className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active ? 'border-primary-600 bg-primary-50 text-primary-900' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <Checkbox
                      checked={active}
                      onChange={() =>
                        setCustomDays((current) =>
                          current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day],
                        )
                      }
                    />
                    {day.slice(0, 3)}
                  </label>
                );
              })}
            </div>
          </FormField>
        )}

        <Button
          onClick={submit}
          disabled={
            !effectiveDate ||
            !hasChanges ||
            (quantity !== undefined && (!Number.isFinite(quantity) || quantity < 0.001)) ||
            (price !== undefined && (!Number.isFinite(price) || price < 0.01)) ||
            (scheduleChanged && newSchedule === 'custom' && customDays.length === 0)
          }
          loading={scheduleChange.isPending}
          className="min-h-10 w-full mt-1"
        >
          Schedule Future Change
        </Button>

        <ConfirmDialog
          open={confirmCancel}
          onOpenChange={setConfirmCancel}
          title="Cancel Pending Change?"
          description="The scheduled future change will be discarded immediately."
          confirmLabel="Cancel Change"
          onConfirm={() => {
            cancelChange.mutate(subId, { onSuccess: () => setConfirmCancel(false) });
          }}
          loading={cancelChange.isPending}
        />
      </CardContent>
    </Card>
  );
}
