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

export function ScheduleConfig({ subscription }: { subscription: SubscriptionDetail }) {
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
    scheduleChange.mutate({
      id: subId,
      data: {
        effectiveDate,
        deliverySchedule: scheduleChanged ? newSchedule : undefined,
        customDays: scheduleChanged && newSchedule === 'custom' ? customDays : undefined,
        scheduledQty: quantity,
        scheduledPrice: price,
        slot: isMultiSlot && quantity !== undefined ? newSlot : undefined,
      },
    });
  };

  const minEffectiveDate = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600">Current:</span>
          <Badge variant="info">{titleCase(subscription.deliverySchedule)}</Badge>
          <span className="text-slate-600">
            {isMultiSlot
              ? slotConfig
                  .map(
                    (s) =>
                      `${s.quantityPerDelivery} ${s.slot === 'morning' ? 'AM' : 'PM'}`,
                  )
                  .join(' · ')
              : `${subscription.quantityPerDelivery ?? subscription.quantityPerDay}/delivery · ${titleCase(typeof (subscription.deliverySlot ?? subscription.slot) === 'string' ? (subscription.deliverySlot ?? subscription.slot) as string : '')}`}
          </span>
        </div>

        {pending && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-warning-bg px-3 py-2">
            <Badge variant="warning">Pending change</Badge>
            <span className="text-slate-700">
              {pending.deliverySchedule ? titleCase(pending.deliverySchedule) : ''}{' '}
              {(pending.scheduledQty ?? pending.quantityPerDay ?? pending.quantityPerDelivery) != null
                ? `· ${pending.scheduledQty ?? pending.quantityPerDay ?? pending.quantityPerDelivery}${pending.slot ? ` ${titleCase(pending.slot)}` : ''}/delivery`
                : ''}{' '}
              {pending.scheduledPrice != null ? `· ${formatCurrency(pending.scheduledPrice)}/unit` : ''}{' '}
              {pending.customDays?.length ? `· ${pending.customDays.join(', ')}` : ''}{' '}
              {pending.effectiveDate ? `from ${formatDate(pending.effectiveDate)}` : ''}
            </span>
            <Button variant="outline" size="sm" onClick={() => setConfirmCancel(true)}>
              Cancel pending
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Effective date">
            <Input
              type="date"
              min={minEffectiveDate}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </FormField>
          <FormField label="New schedule">
            <Select value={newSchedule} onChange={(e) => setNewSchedule(e.target.value as "daily" | "custom" | "alternate" | "weekly")}>
              <option value="daily">Daily</option>
              <option value="alternate">Alternate</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </Select>
          </FormField>
          <FormField label={isMultiSlot ? 'New qty' : 'New qty / delivery'}>
            <Input type="number" min={0.001} step={0.001} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
          </FormField>
          <FormField label="New price / unit">
            <Input type="number" min={0.01} step={0.01} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </FormField>
          {isMultiSlot && (
            <FormField label="Target slot" required>
              <Select value={newSlot} onChange={(e) => setNewSlot(e.target.value as DeliverySlot)}>
                {slotConfig.map((s) => (
                  <option key={s.slot} value={s.slot}>
                    {s.slot === 'morning' ? 'Morning' : 'Evening'}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>
        {newSchedule === 'custom' && (
          <FormField label="Custom days" required hint="Select at least one delivery day">
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => (
                <label key={day} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <Checkbox
                    checked={customDays.includes(day)}
                    onChange={() =>
                      setCustomDays((current) =>
                        current.includes(day)
                          ? current.filter((entry) => entry !== day)
                          : [...current, day],
                      )
                    }
                  />
                  {day}
                </label>
              ))}
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
          className="min-h-11 self-start"
        >
          Schedule future change
        </Button>

        <ConfirmDialog
          open={confirmCancel}
          onOpenChange={setConfirmCancel}
          title="Cancel pending change?"
          description="The scheduled future change will be discarded."
          confirmLabel="Cancel change"
          onConfirm={() => {
            cancelChange.mutate(subId, { onSuccess: () => setConfirmCancel(false) });
          }}
          loading={cancelChange.isPending}
        />
      </CardContent>
    </Card>
  );
}
