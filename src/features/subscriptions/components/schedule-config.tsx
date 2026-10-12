import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/form/form-field';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { formatDate, titleCase } from '@/lib/utils';
import { useCancelScheduleChange, useScheduleChange } from '../hooks';
import type { SubscriptionDetail } from '../api';

export function ScheduleConfig({ subscription }: { subscription: SubscriptionDetail }) {
  const [effectiveDate, setEffectiveDate] = useState('');
  const [newSchedule, setNewSchedule] = useState('daily');
  const [newQty, setNewQty] = useState<string>('1');
  const [newSlot, setNewSlot] = useState('morning');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const scheduleChange = useScheduleChange();
  const cancelChange = useCancelScheduleChange();

  const pending = subscription.pendingScheduleChange ?? subscription.pendingChange ?? null;
  const subId =
    (typeof subscription.id === 'string' && subscription.id) ||
    (typeof (subscription as { _id?: unknown })._id === 'string'
      ? ((subscription as { _id?: string })._id as string)
      : '');

  const submit = () => {
    if (!effectiveDate) return;
    scheduleChange.mutate({
      id: subId,
      data: {
        effectiveDate,
        deliverySchedule: newSchedule,
        quantityPerDay: Number(newQty) || undefined,
        slot: newSlot,
      },
    });
  };

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
            {subscription.quantityPerDay}/day · {titleCase(typeof subscription.slot === 'string' ? subscription.slot : '')}
          </span>
        </div>

        {pending && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-warning-bg px-3 py-2">
            <Badge variant="warning">Pending change</Badge>
            <span className="text-slate-700">
              {pending.deliverySchedule ? titleCase(pending.deliverySchedule) : ''}{' '}
              {pending.quantityPerDay ? `· ${pending.quantityPerDay}/day` : ''}{' '}
              {pending.effectiveDate ? `from ${formatDate(pending.effectiveDate)}` : ''}
            </span>
            <Button variant="outline" size="sm" onClick={() => setConfirmCancel(true)}>
              Cancel pending
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Effective date">
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </FormField>
          <FormField label="New schedule">
            <Select value={newSchedule} onChange={(e) => setNewSchedule(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="alternate">Alternate</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </Select>
          </FormField>
          <FormField label="New qty / day">
            <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
          </FormField>
          <FormField label="New slot">
            <Select value={newSlot} onChange={(e) => setNewSlot(e.target.value)}>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </Select>
          </FormField>
        </div>
        <Button onClick={submit} disabled={!effectiveDate} loading={scheduleChange.isPending} className="min-h-11 self-start">
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
