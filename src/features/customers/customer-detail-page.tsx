import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Clock,
  ExternalLink,
  Hash,
  ListOrdered,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Settings,
  ShoppingCart,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/data/status-badge';
import { FormField } from '@/components/form/form-field';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { cn, formatCurrency, getErrorMessage, getId, getName, normalizeList, shortId, titleCase } from '@/lib/utils';
import { useCustomer, useUpdateCustomer } from './hooks';
import { customersApi } from './api';
import { CustomerForm } from './components/customer-form';
import type { AreaOption } from './components/customer-form';
import { customerBalance } from './components/customer-table';
import { CustomerOrdersTab } from './components/customer-orders-tab';
import { CustomerSubscriptionsTab } from './components/customer-subscriptions-tab';
import { AdjustBalanceDialog, CollectPaymentDialog, CustomerPaymentsTab } from './components/customer-payments-tab';
import { CustomerBalanceTab } from './components/customer-balance-tab';
import { MonthSlider } from './components/month-slider';
import type { UpdateCustomerInput } from './schemas';
import type { Address } from '@/types/customer';
import type { Product } from '@/types/product';

const subscribeSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantityPerDelivery: z.coerce.number().min(1, 'Quantity must be at least 1'),
  customPrice: z.coerce.number().min(0).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  deliverySlot: z.enum(['morning', 'evening']).default('morning'),
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
    defaultValues: { productId: '', quantityPerDelivery: 1, startDate: new Date().toISOString().slice(0, 10), deliverySlot: 'morning' },
  });

  const createSub = useMutation({
    mutationFn: (values: SubscribeValues) => {
      const payload = {
        userId,
        productId: values.productId,
        quantityPerDelivery: values.quantityPerDelivery,
        customPrice: values.customPrice && values.customPrice > 0 ? values.customPrice : undefined,
        startDate: values.startDate,
        deliverySlot: values.deliverySlot,
        deliverySchedule: 'daily',
        customDays: [],
      };
      return api.post<unknown>('/api/subscriptions/admin/create', payload);
    },
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
                    {p.name} · {formatCurrency((p as unknown as Record<string,unknown>).basePrice as number ?? p.price)}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Qty / delivery" required error={form.formState.errors.quantityPerDelivery?.message}>
                <Input type="number" min={1} {...form.register('quantityPerDelivery')} />
              </FormField>
              <FormField label="Price / unit" error={form.formState.errors.customPrice?.message}>
                <Input type="number" min={0} placeholder="Default price" {...form.register('customPrice')} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start date" required error={form.formState.errors.startDate?.message}>
                <Input type="date" {...form.register('startDate')} />
              </FormField>
              <FormField label="Slot">
                <Select {...form.register('deliverySlot')}>
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

function formatAddress(address: Address): string {
  return [address.street || address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
}

function MetaItem({
  icon: Icon,
  label,
  value,
  muted,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-1.5 whitespace-nowrap', className)} title={label}>
      <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden />
      <span className="sr-only">{label}: </span>
      <span className={cn('font-medium text-slate-700', muted && 'font-normal text-slate-400')}>{value}</span>
    </span>
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
    if (isLoading) {
      return (
        <div className="flex flex-col gap-4">
          <PageHeader title="Customer" breadcrumbs={[{ label: 'Customers', path: '/customers' }, { label: 'Details' }]} />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Customer" breadcrumbs={[{ label: 'Customers', path: '/customers' }, { label: 'Details' }]} />
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Customer not found.</CardContent>
        </Card>
      </div>
    );
  }

  const balance = customerBalance(customer);
  const areaLabel = customer.deliveryConfig?.assignedAreaName ?? customer.areaName;
  const addresses = customer.addresses ?? [];
  const primaryAddress = addresses[0];
  const addressStr = [
    primaryAddress?.line1 ?? primaryAddress?.street,
    primaryAddress?.line2,
    primaryAddress?.city,
    primaryAddress?.pincode,
  ]
    .filter(Boolean)
    .join(', ');
  const deliverySequence = customer.deliveryConfig?.deliverySequence;
  const deliverySlot = customer.deliveryConfig?.slot;
  const mapAddress = addresses.find((a) => a.lat != null && a.lng != null);
  const mapUrl = mapAddress ? `https://www.google.com/maps?q=${mapAddress.lat},${mapAddress.lng}` : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={customer.name}
        breadcrumbs={[{ label: 'Customers', path: '/customers' }, { label: customer.name }]}
      />

      <Card>
        <CardContent className="relative flex flex-col gap-3 px-4 pt-4 pb-1.5 lg:p-4 lg:pt-4 lg:pb-1.5">
          {/* Identity — name, status, dues (desktop); email left / phone pinned right */}
          <div className="min-w-0 space-y-1">
            {/* Name row only: clear the corner gear (contact row below stays full width) */}
            <div className="flex flex-wrap items-center gap-1.5 pr-10">
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{customer.name}</h2>
              <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
              {/* Dues — hidden on mobile so the compact card stays uncluttered */}
              <Badge variant={balance > 0 ? 'warning' : 'success'} className="hidden sm:inline-flex">
                {balance > 0 ? `Due ${formatCurrency(balance)}` : 'No dues'}
              </Badge>
            </div>
            {/* Same row, opposite corners — email left (truncates), phone pinned right */}
            <div className="flex items-center gap-x-3 text-sm text-slate-600">
              {customer.email && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{customer.email}</span>
                </span>
              )}
              {customer.phone && (
                <span className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                  <Phone className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
          {/* Settings — pinned to the card's top-right corner at every size */}
          <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <DropdownMenu
                trigger={
                  <Button size="sm" variant="ghost" className="size-9 p-0 text-slate-600 hover:text-slate-900" aria-label="Customer settings">
                    <Settings className="size-5" aria-hidden />
                  </Button>
                }
              >
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSubscribeOpen(true)}>
                  <Plus className="size-4" /> Subscribe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrderOpen(true)}>
                  <ShoppingCart className="size-4" /> New order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCollectOpen(true)}>
                  <Wallet className="size-4" /> Collect payment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAdjustOpen(true)}>
                  <Pencil className="size-4" /> Adjust balance
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
        </CardContent>

        {/* Key details — address (left) with seq no. right edge; area · slot · spent (left) with ID at right edge */}
        <div className="flex flex-col gap-1.5 border-t border-slate-100 px-4 pt-1.5 pb-3.5">
          <div className="flex items-start justify-between gap-x-3 text-[13px] leading-snug">
            <div className="flex min-w-0 items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden />
              <p className="min-w-0 text-slate-700">
                {addresses.length > 0 ? (
                  addresses.map((address, index) => (
                    <span key={address.id ?? index}>
                      {index > 0 ? <span className="text-slate-300">{' · '}</span> : null}
                      {formatAddress(address)}
                      {address.type ? <span className="text-slate-400"> ({address.type})</span> : null}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">No address on file</span>
                )}
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-primary-600 hover:underline"
                  >
                    Maps <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : null}
              </p>
            </div>
            {deliverySequence !== null && deliverySequence !== undefined ? (
              <span className="flex shrink-0 items-center gap-1 text-slate-600" title="Delivery sequence">
                <ListOrdered className="size-3.5 text-slate-400" aria-hidden />
                <span className="sr-only">Delivery sequence: </span>
                <span className="font-medium">{deliverySequence}</span>
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            <MetaItem icon={Truck} label="Delivery area" value={areaLabel ?? 'Not assigned'} muted={!areaLabel} />
            {deliverySlot ? <MetaItem icon={Clock} label="Delivery slot" value={titleCase(deliverySlot)} /> : null}
            {customer.totalSpent !== undefined && customer.totalSpent !== null ? (
              <MetaItem icon={Wallet} label="Total spent" value={formatCurrency(customer.totalSpent)} />
            ) : null}
            <MetaItem icon={Hash} label="Customer ID" value={shortId(getId(customer))} className="ml-auto" />
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <div className="mb-3 sm:max-w-md">
            <MonthSlider
              className="sm:hidden"
              month={month}
              year={year}
              onChange={(m, y) => {
                setMonth(m);
                setYear(y);
              }}
            />
            <div className="hidden grid-cols-2 gap-3 sm:grid">
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
          </div>
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
            onCollect={() => setCollectOpen(true)}
            onAdjust={() => setAdjustOpen(true)}
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
    </div>
  );
}
