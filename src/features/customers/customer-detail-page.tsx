import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil, Plus, ShoppingCart, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/data/status-badge';
import { FormField } from '@/components/form/form-field';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate, getErrorMessage, getId, getName, normalizeList, shortId } from '@/lib/utils';
import { useCustomer, useUpdateCustomer } from './hooks';
import { customersApi } from './api';
import { CustomerForm } from './components/customer-form';
import type { AreaOption } from './components/customer-form';
import { customerBalance } from './components/customer-table';
import { CustomerOrdersTab } from './components/customer-orders-tab';
import { CustomerSubscriptionsTab } from './components/customer-subscriptions-tab';
import { AdjustBalanceDialog, CollectPaymentDialog, CustomerPaymentsTab } from './components/customer-payments-tab';
import { CustomerBalanceTab } from './components/customer-balance-tab';
import type { UpdateCustomerInput } from './schemas';
import type { Product } from '@/types/product';

const subscribeSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantityPerDay: z.coerce.number().min(1, 'Quantity must be at least 1'),
  pricePerUnit: z.coerce.number().min(0).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  slot: z.enum(['morning', 'evening']).default('morning'),
});

type SubscribeValues = z.infer<typeof subscribeSchema>;

const quickOrderSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
});

type QuickOrderValues = z.infer<typeof quickOrderSchema>;

function SubscribeDialog({ userId, open, onOpenChange }: { userId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: productsRes } = useQuery({
    queryKey: queryKeys.products.list({ limit: 100 }),
    queryFn: () => api.get<unknown>('/api/products', { limit: 100 }),
    enabled: open,
  });
  const { items: products } = React.useMemo(() => normalizeList<Product>(productsRes, ['products']), [productsRes]);

  const form = useForm<SubscribeValues>({
    resolver: zodResolver(subscribeSchema) as unknown as Resolver<SubscribeValues>,
    defaultValues: { productId: '', quantityPerDay: 1, startDate: new Date().toISOString().slice(0, 10), slot: 'morning' },
  });

  const createSub = useMutation({
    mutationFn: (values: SubscribeValues) =>
      api.post<unknown>('/api/subscriptions/admin/create', { userId, ...values }),
    onSuccess: () => {
      toast.success('Subscription created');
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(userId) });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => createSub.mutate(v as unknown as SubscribeValues))} className="flex flex-col">
          <DialogBody className="flex flex-col gap-4">
            <FormField label="Product" required error={form.formState.errors.productId?.message}>
              <Select {...form.register('productId')}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={getId(p) || p.id} value={getId(p) || p.id}>
                    {p.name} · {formatCurrency(p.price)}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Qty / day" required error={form.formState.errors.quantityPerDay?.message}>
                <Input type="number" min={1} {...form.register('quantityPerDay')} />
              </FormField>
              <FormField label="Price / unit" error={form.formState.errors.pricePerUnit?.message}>
                <Input type="number" min={0} placeholder="Default price" {...form.register('pricePerUnit')} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start date" required error={form.formState.errors.startDate?.message}>
                <Input type="date" {...form.register('startDate')} />
              </FormField>
              <FormField label="Slot">
                <Select {...form.register('slot')}>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </Select>
              </FormField>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createSub.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createSub.isPending}>
              Create subscription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickOrderDialog({ userId, open, onOpenChange }: { userId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: productsRes } = useQuery({
    queryKey: queryKeys.products.list({ limit: 100, lite: true }),
    queryFn: () => api.get<unknown>('/api/products', { limit: 100 }),
    enabled: open,
  });
  const { items: products } = React.useMemo(() => normalizeList<Product>(productsRes, ['products']), [productsRes]);

  const form = useForm<QuickOrderValues>({
    resolver: zodResolver(quickOrderSchema) as unknown as Resolver<QuickOrderValues>,
    defaultValues: { productId: '', quantity: 1 },
  });

  const createOrder = useMutation({
    mutationFn: (values: QuickOrderValues) => {
      const product = products.find((p) => (getId(p) || p.id) === values.productId);
      return api.post<unknown>(
        '/api/orders/admin/create',
        {
          userId,
          items: [{ productId: values.productId, quantity: values.quantity, price: product?.price ?? 0 }],
          paymentMethod: 'COD',
        },
        { idempotent: true },
      );
    },
    onSuccess: () => {
      toast.success('Order created');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => createOrder.mutate(v as unknown as QuickOrderValues))} className="flex flex-col">
          <DialogBody className="flex flex-col gap-4">
            <FormField label="Product" required error={form.formState.errors.productId?.message}>
              <Select {...form.register('productId')}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={getId(p) || p.id} value={getId(p) || p.id}>
                    {p.name} · {formatCurrency(p.price)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantity" required error={form.formState.errors.quantity?.message}>
              <Input type="number" min={1} {...form.register('quantity')} />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createOrder.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createOrder.isPending}>
              Place order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { data: customer, isLoading } = useCustomer(id);
  const updateMutation = useUpdateCustomer();

  const [editOpen, setEditOpen] = React.useState(false);
  const [subscribeOpen, setSubscribeOpen] = React.useState(false);
  const [orderOpen, setOrderOpen] = React.useState(false);
  const [collectOpen, setCollectOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [tab, setTab] = React.useState('ledger');

  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());

  const { data: areasRes } = useQuery({
    queryKey: queryKeys.areas.list(),
    queryFn: () => customersApi.areasLite(),
  });
  const areas: AreaOption[] = React.useMemo(
    () => (areasRes ?? []).map((a) => ({ id: getId(a) || a.id, name: a.name })),
    [areasRes],
  );

  async function handleEdit(values: UpdateCustomerInput) {
    if (!id) return;
    await updateMutation.mutateAsync({
      id,
      data: {
        ...values,
        email: values.email || undefined,
        password: values.password || undefined,
      },
    });
    setEditOpen(false);
  }

  if (isLoading || !customer) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Customer" breadcrumbs={[{ label: 'Customers', path: '/customers' }, { label: 'Details' }]} />
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">{isLoading ? 'Loading…' : 'Customer not found.'}</CardContent>
        </Card>
      </div>
    );
  }

  const balance = customerBalance(customer);
  const areaLabel = customer.deliveryConfig?.assignedAreaName ?? customer.areaName;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={customer.name}
        breadcrumbs={[{ label: 'Customers', path: '/customers' }, { label: customer.name }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="min-h-11">
              <Pencil aria-hidden /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSubscribeOpen(true)} className="min-h-11">
              <Plus aria-hidden /> Subscribe
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOrderOpen(true)} className="min-h-11">
              <ShoppingCart aria-hidden /> New order
            </Button>
            <Button size="sm" onClick={() => setCollectOpen(true)} className="min-h-11">
              <Wallet aria-hidden /> Collect
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Avatar name={customer.name} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{customer.name}</h2>
              {!customer.isActive && <StatusBadge status="inactive" />}
            </div>
            <p className="text-sm text-slate-500">
              {customer.phone ?? '—'}
              {customer.email ? ` · ${customer.email}` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {shortId(getId(customer))} · Since {formatDate(customer.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={balance > 0 ? 'warning' : 'success'}>
              {balance > 0 ? `Due ${formatCurrency(balance)}` : 'No dues'}
            </Badge>
            {areaLabel ? <Badge variant="secondary">{areaLabel}</Badge> : null}
            {customer.deliveryConfig?.deliverySequence !== undefined && customer.deliveryConfig?.deliverySequence !== null ? (
              <Badge variant="outline">Seq {customer.deliveryConfig.deliverySequence}</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Ledger month">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </Select>
        <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))} aria-label="Ledger year">
          {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <CustomerPaymentsTab userId={getId(customer)} month={month} year={year} />
        </TabsContent>
        <TabsContent value="orders">
          <CustomerOrdersTab userId={getId(customer)} />
        </TabsContent>
        <TabsContent value="subscriptions">
          <CustomerSubscriptionsTab userId={getId(customer)} />
        </TabsContent>
        <TabsContent value="balance">
          <CustomerBalanceTab
            userId={getId(customer)}
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-slate-400">
        Viewing as {getName(customer)} · <Link to="/customers" className="underline">Back to customers</Link>
      </p>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Edit customer</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <CustomerForm
              mode="edit"
              areas={areas}
              submitting={updateMutation.isPending}
              defaultValues={{
                name: customer.name,
                email: customer.email ?? '',
                phone: customer.phone ?? '',
                role: (customer.role as 'customer' | 'agent' | 'admin') ?? 'customer',
                isActive: customer.isActive,
              }}
              onSubmit={handleEdit}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <SubscribeDialog userId={getId(customer)} open={subscribeOpen} onOpenChange={setSubscribeOpen} />
      <QuickOrderDialog userId={getId(customer)} open={orderOpen} onOpenChange={setOrderOpen} />
      <CollectPaymentDialog userId={getId(customer)} open={collectOpen} onOpenChange={setCollectOpen} />
      <AdjustBalanceDialog userId={getId(customer)} open={adjustOpen} onOpenChange={setAdjustOpen} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(true)} className="min-h-11">
          Adjust balance
        </Button>
      </div>
    </div>
  );
}
