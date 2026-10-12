import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/data/status-badge';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetBody, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { formatCurrency, formatDate, getErrorMessage, getName, getPhone, titleCase } from '@/lib/utils';
import { useSubscription, useSubscriptionHistory, useUpdateSubscription, useUpdateSubscriptionStatus } from './hooks';
import type { SubscriptionInput } from './schemas';
import { SubscriptionForm } from './components/subscription-form';
import { DeliveryHistory } from './components/delivery-history';
import { ScheduleConfig } from './components/schedule-config';

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const detailQuery = useSubscription(id);
  const updateMutation = useUpdateSubscription();
  const statusMutation = useUpdateSubscriptionStatus();

  const now = new Date();
  const currentHistory = useSubscriptionHistory(id, {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const subscription = detailQuery.data;

  const stats = useMemo(() => {
    const daily = subscription
      ? (subscription.totalPricePerDay ?? subscription.quantityPerDay * subscription.pricePerUnit)
      : 0;
    const monthItems = currentHistory.data?.items ?? [];
    const delivered = monthItems.filter((e) => e.status === 'delivered').length;
    const monthCharges = monthItems.reduce((sum, e) => {
      const q = e.actualQuantity ?? e.quantity ?? 0;
      return sum + Number(e.amount ?? (e.rate != null ? Number(q) * Number(e.rate) : 0));
    }, 0);
    return {
      daily,
      delivered,
      total: monthItems.length,
      monthCharges,
      pendingDue: subscription?.pendingAmount ?? null,
      nextDelivery: subscription?.nextDeliveryDate ?? null,
    };
  }, [subscription, currentHistory.data]);

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (detailQuery.isError || !subscription) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          message={getErrorMessage(detailQuery.error, 'Subscription not found')}
          onRetry={() => detailQuery.refetch()}
        />
      </div>
    );
  }

  const customerName = getName(subscription.userId, subscription.customerName ?? '—');
  const phone = getPhone(subscription.userId);
  const productName = getName(subscription.productId, subscription.productName ?? '—');

  const handleEdit = (values: SubscriptionInput) => {
    if (!id) return;
    updateMutation.mutate({ id, data: values }, { onSuccess: () => setEditOpen(false) });
  };

  const statCards = [
    { label: 'Daily value', value: formatCurrency(stats.daily) },
    { label: 'Delivered / total', value: `${stats.delivered} / ${stats.total}` },
    { label: 'This month charges', value: formatCurrency(stats.monthCharges) },
    { label: 'Pending due', value: stats.pendingDue != null ? formatCurrency(stats.pendingDue) : '—' },
    { label: 'Next delivery', value: stats.nextDelivery ? formatDate(stats.nextDelivery) : '—' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={productName}
        description={`${customerName}${phone ? ` · ${phone}` : ''}`}
        breadcrumbs={[{ label: 'Subscriptions', path: '/subscriptions' }, { label: productName }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={subscription.status} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="min-h-11">
              <Pencil /> Edit
            </Button>
          </div>
        }
      />

      {phone && (
        <a href={`tel:${phone}`} className="text-sm text-primary-700 hover:underline">
          Call {customerName}: {phone}
        </a>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="mt-1 text-base font-semibold text-slate-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Product</div>
            <div className="font-medium">{productName}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Schedule</div>
            <div className="font-medium">{titleCase(subscription.deliverySchedule)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Qty / day</div>
            <div className="font-medium">{subscription.quantityPerDay}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Rate</div>
            <div className="font-medium">{formatCurrency(subscription.pricePerUnit)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Daily total</div>
            <div className="font-medium">{formatCurrency(stats.daily)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Start date</div>
            <div className="font-medium">{formatDate(subscription.startDate)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {subscription.status === 'active' && (
          <Button variant="outline" onClick={() => setPendingStatus('paused')} className="min-h-11">
            Pause
          </Button>
        )}
        {subscription.status === 'paused' && (
          <Button variant="outline" onClick={() => setPendingStatus('active')} className="min-h-11">
            Resume
          </Button>
        )}
        {subscription.status !== 'cancelled' && (
          <Button variant="outline" onClick={() => setPendingStatus('cancelled')} className="min-h-11">
            Cancel subscription
          </Button>
        )}
      </div>

      <DeliveryHistory subscriptionId={id as string} startMonth={subscription.startDate?.slice(0, 7)} />

      <ScheduleConfig subscription={subscription} />

      <Link to="/subscriptions" className="text-sm text-primary-700 hover:underline">
        ← Back to subscriptions
      </Link>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetBody>
          <SheetHeader>
            <SheetTitle>Edit subscription</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SubscriptionForm
              defaultValues={{
                userId:
                  typeof subscription.userId === 'string'
                    ? subscription.userId
                    : (subscription.userId.id ?? ''),
                productId:
                  typeof subscription.productId === 'string'
                    ? subscription.productId
                    : (subscription.productId.id ?? ''),
                variantId: subscription.variantId ?? undefined,
                quantityPerDay: subscription.quantityPerDay,
                pricePerUnit: subscription.pricePerUnit,
                startDate: subscription.startDate?.slice(0, 10) ?? '',
                deliverySchedule: subscription.deliverySchedule,
                customDays: subscription.customDays ?? [],
                slot:
                  subscription.slot === 'evening' ? 'evening' : 'morning',
              }}
              onSubmit={handleEdit}
              submitting={updateMutation.isPending}
            />
          </div>
        </SheetBody>
      </Sheet>

      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
        title={`${pendingStatus === 'active' ? 'Resume' : pendingStatus === 'paused' ? 'Pause' : 'Cancel'} subscription?`}
        description={
          pendingStatus === 'cancelled'
            ? 'This will cancel the subscription. This action can be reversed by support if needed.'
            : `The subscription will be marked as ${pendingStatus}.`
        }
        confirmLabel="Confirm"
        onConfirm={() => {
          if (!id || !pendingStatus) return;
          statusMutation.mutate(
            { id, status: pendingStatus },
            { onSuccess: () => setPendingStatus(null) },
          );
        }}
        loading={statusMutation.isPending}
      />
    </div>
  );
}
