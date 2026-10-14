import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/data/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/data/status-badge';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
    const qty = subscription
      ? (subscription.quantityPerDelivery ?? subscription.quantityPerDay ?? 0)
      : 0;
    const rate = subscription
      ? (subscription.pricePerPacket ?? subscription.pricePerUnit ?? 0)
      : 0;
    const daily = subscription
      ? (subscription.totalPricePerDelivery ?? subscription.totalPricePerDay ?? qty * rate)
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
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 [&_svg]:size-4 [&_svg]:shrink-0"
              >
                <Phone className="size-4" /> {phone}
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="min-h-11">
              <Pencil /> Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
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
            <div className="text-xs text-slate-500">Qty / delivery</div>
            <div className="font-medium">{subscription.quantityPerDelivery ?? subscription.quantityPerDay}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Rate</div>
            <div className="font-medium">{formatCurrency(subscription.pricePerPacket ?? subscription.pricePerUnit ?? 0)}</div>
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

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
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
        </CardContent>
      </Card>

      <DeliveryHistory subscriptionId={id as string} startMonth={subscription.startDate?.slice(0, 7)} />

      <ScheduleConfig subscription={subscription} />

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit subscription</SheetTitle>
          </SheetHeader>
          <SheetBody>
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
                quantityPerDelivery: subscription.quantityPerDelivery ?? subscription.quantityPerDay ?? 1,
                customPrice: subscription.pricePerPacket ?? subscription.pricePerUnit ?? 0,
                startDate: subscription.startDate?.slice(0, 10) ?? '',
                deliverySchedule: subscription.deliverySchedule,
                customDays: subscription.customDays ?? [],
                deliverySlot:
                  ((subscription.deliverySlot ?? subscription.slot) === 'evening') ? 'evening' : 'morning',
              }}
              onSubmit={handleEdit}
              submitting={updateMutation.isPending}
            />
          </SheetBody>
        </SheetContent>
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
