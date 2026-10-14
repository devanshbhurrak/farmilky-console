import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/data/status-badge';
import { formatCurrency, formatDate, formatDateTime, getId, getName, shortId } from '@/lib/utils';
import { useOrder, useUpdateOrder } from './hooks';
import { OrderForm } from './components/order-form';
import { OrderStatusActions } from './components/order-status-actions';
import { orderCustomerName, orderStatusOf } from './components/order-table';
import type { CreateOrderInput } from './schemas';
import type { Order } from '@/types/order';

function customerIdOf(order: Order): string {
  if (typeof order.userId === 'object' && order.userId !== null) return order.userId.id;
  return String(order.userId ?? '');
}

function AddressBlock({ order }: { order: Order }) {
  const a = order.address;
  if (!a) return <p className="text-sm text-slate-500">No address on file.</p>;
  if (typeof a === 'string') return <p className="text-sm text-slate-700">{a}</p>;
  return (
    <p className="text-sm text-slate-700">
      {[a.street, a.city, a.state, a.pincode].filter(Boolean).join(', ') || '—'}
    </p>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading } = useOrder(id);
  const updateMutation = useUpdateOrder();
  const [editOpen, setEditOpen] = React.useState(false);

  async function handleEdit(values: CreateOrderInput) {
    if (!id) return;
    await updateMutation.mutateAsync({ id, data: values });
    setEditOpen(false);
  }

  if (isLoading || !order) {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-4">
          <PageHeader title="Order" breadcrumbs={[{ label: 'Orders', path: '/orders' }, { label: 'Details' }]} />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Order" breadcrumbs={[{ label: 'Orders', path: '/orders' }, { label: 'Details' }]} />
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Order not found.</CardContent>
        </Card>
      </div>
    );
  }

  const timeline: { label: string; value: string | null | undefined }[] = [
    { label: 'Placed', value: order.createdAt },
    { label: 'Confirmed', value: order.confirmedAt },
    { label: 'Delivered', value: order.deliveredAt },
    { label: 'Cancelled', value: order.cancelledAt },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Order ${shortId(getId(order))}`}
        breadcrumbs={[{ label: 'Orders', path: '/orders' }, { label: shortId(getId(order)) }]}
        actions={
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="min-h-11">
            <Pencil aria-hidden /> Edit
          </Button>
        }
      />

      <Card className="border-primary-200 bg-primary-50">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-primary-700">Total</p>
            <p className="text-3xl font-bold text-primary-900">{formatCurrency(order.totalAmount)}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={orderStatusOf(order)} />
            <StatusBadge status={String(order.paymentStatus ?? 'pending')} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <Link to={`/customers/${customerIdOf(order)}`} className="font-medium text-primary-700 hover:underline">
              {orderCustomerName(order)}
            </Link>
            {typeof order.userId === 'object' && order.userId !== null && order.userId.phone ? (
              <a href={`tel:${order.userId.phone}`} className="text-sm text-slate-500 hover:underline">
                {order.userId.phone}
              </a>
            ) : null}
            <p className="text-xs text-slate-400">Ordered {formatDate(order.orderDate ?? order.createdAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivery address</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressBlock order={order} />
            {order.deliveryDate ? (
              <p className="mt-1 text-xs text-slate-500">Deliver by {formatDate(order.deliveryDate)}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <p>
            <span className="text-slate-500">Method: </span>
            <span className="font-medium uppercase">{String(order.paymentMethod)}</span>
          </p>
          <p>
            <span className="text-slate-500">Status: </span>
            <span className="font-medium capitalize">{String(order.paymentStatus ?? 'pending')}</span>
          </p>
          {order.transactionId ? (
            <p>
              <span className="text-slate-500">Txn: </span>
              <span className="font-medium">{order.transactionId}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {order.items.map((it, i) => (
            <div key={`${it.productId}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">
                {getName(it.productId, it.productName ?? it.name ?? 'Item')}
                {it.variantLabel ? <span className="text-xs text-slate-500"> · {it.variantLabel}</span> : null}
                <span className="text-xs text-slate-500"> × {it.quantity}</span>
              </span>
              <span className="font-semibold whitespace-nowrap">
                {formatCurrency(Number(it.lineTotal ?? Number(it.quantity) * Number(it.price)))}
              </span>
            </div>
          ))}
          {order.notes ? <p className="text-sm text-slate-500">Notes: {order.notes}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col gap-4 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-slate-200">
            {timeline.map((t) => (
              <li key={t.label} className="relative flex items-center justify-between gap-2 text-sm">
                <span
                  aria-hidden
                  className={`absolute -left-6 top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-4 ring-white ${t.value ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
                <span className="font-medium text-slate-700">{t.label}</span>
                <span className="text-slate-500">{t.value ? formatDateTime(t.value) : '—'}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusActions order={order} />
        </CardContent>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit order</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <OrderForm
              submitting={updateMutation.isPending}
              initialCustomerName={orderCustomerName(order)}
              defaultValues={{
                userId: customerIdOf(order),
                items: order.items.map((it) => ({
                  productId: typeof it.productId === 'string' ? it.productId : getId(it.productId),
                  variantId: it.variantId ?? undefined,
                  quantity: it.quantity,
                  price: it.price,
                })),
                paymentMethod: (['COD', 'online', 'upi', 'cash'] as const).includes(order.paymentMethod as 'COD')
                  ? (order.paymentMethod as 'COD' | 'online' | 'upi' | 'cash')
                  : 'COD',
                deliveryDate: order.deliveryDate?.slice(0, 10) ?? '',
                notes: order.notes ?? '',
              }}
              onSubmit={handleEdit}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
