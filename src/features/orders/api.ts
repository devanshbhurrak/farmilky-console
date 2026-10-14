import { api } from '@/lib/api-client';
import { getId, normalizeList, unwrapData } from '@/lib/utils';
import type { Order, OrderListParams } from '@/types/order';
import type { Customer } from '@/types/customer';
import type { Product } from '@/types/product';

type RawRecord = Record<string, unknown>;

function toOrder(raw: unknown): Order {
  const root = (raw ?? {}) as RawRecord;
  // Admin GET returns { order, items, attempts } — flatten before mapping.
  const o: RawRecord =
    root.order && typeof root.order === 'object'
      ? { ...(root.order as RawRecord), items: root.items ?? (root.order as RawRecord).items }
      : root;
  const items = (Array.isArray(o.items) ? o.items : []) as Order['items'];
  // Backend serializes item price as `unitPrice` (numeric string).
  const itemLineTotal = (it: Order['items'][number]) =>
    Number(it.quantity ?? 0) * Number(it.price ?? it.unitPrice ?? 0);
  const total = Number(o.totalAmount ?? o.total ?? items.reduce((s, it) => s + itemLineTotal(it), 0));
  return {
    id: getId(raw) || String(o.id ?? ''),
    userId: (o.userId ?? o.customer ?? '') as Order['userId'],
    customerName: o.customerName !== undefined ? String(o.customerName) : undefined,
    items,
    totalAmount: Number.isNaN(total) ? 0 : total,
    orderStatus: (o.orderStatus ?? o.status ?? 'placed') as Order['orderStatus'],
    status: (o.status ?? o.orderStatus ?? 'placed') as Order['orderStatus'],
    paymentMethod: String(o.paymentMethod ?? 'COD'),
    paymentStatus: String(o.paymentStatus ?? 'pending'),
    transactionId: (o.transactionId as string | null | undefined) ?? null,
    orderDate: o.orderDate !== undefined ? String(o.orderDate) : (o.createdAt !== undefined ? String(o.createdAt) : null),
    deliveryDate: o.deliveryDate !== undefined ? String(o.deliveryDate) : null,
    address: (o.address as Order['address']) ?? null,
    notes: (o.notes as string | null | undefined) ?? null,
    createdAt: String(o.createdAt ?? new Date().toISOString()),
    updatedAt: o.updatedAt !== undefined ? String(o.updatedAt) : undefined,
    confirmedAt: o.confirmedAt !== undefined ? String(o.confirmedAt) : null,
    deliveredAt: o.deliveredAt !== undefined ? String(o.deliveredAt) : null,
    cancelledAt: o.cancelledAt !== undefined ? String(o.cancelledAt) : null,
  };
}

export interface DeliveryOutcomeInput {
  status: string;
  reason?: string;
  notes?: string;
}

export const ordersApi = {
  async list(params: OrderListParams = {}): Promise<{
    items: Order[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get<unknown>('/api/orders/admin/all', {
      ...(params as Record<string, string | number | boolean | null | undefined>),
    });
    const { items, meta } = normalizeList<unknown>(res, ['orders']);
    return { items: items.map(toOrder), meta };
  },

  async get(id: string): Promise<Order> {
    const res = await api.get<unknown>(`/api/orders/admin/${id}`);
    return toOrder(unwrapData<unknown>(res));
  },

  async create(data: unknown): Promise<Order> {
    const res = await api.post<unknown>('/api/orders/admin/create', data, { idempotent: true });
    return toOrder(unwrapData<unknown>(res));
  },

  async update(id: string, data: unknown): Promise<Order> {
    const res = await api.put<unknown>(`/api/orders/admin/${id}`, data);
    return toOrder(unwrapData<unknown>(res));
  },

  async updateStatus(id: string, status: string): Promise<Order> {
    const res = await api.put<unknown>(`/api/orders/admin/${id}/status`, { status });
    return toOrder(unwrapData<unknown>(res));
  },

  async deliveryOutcome(id: string, data: DeliveryOutcomeInput): Promise<Order> {
    const res = await api.post<unknown>(`/api/orders/admin/${id}/delivery-outcome`, data, { idempotent: true });
    return toOrder(unwrapData<unknown>(res));
  },

  async instantDelivery(data: unknown): Promise<Order> {
    const res = await api.post<unknown>('/api/orders/admin/instant-delivery', data, { idempotent: true });
    return toOrder(unwrapData<unknown>(res));
  },

  async productsLite(): Promise<Product[]> {
    const res = await api.get<unknown>('/api/products', { limit: 100 });
    const { items } = normalizeList<Product>(res, ['products']);
    return items;
  },

  async customersLite(search?: string): Promise<Customer[]> {
    const res = await api.get<unknown>('/api/users/admin/all', {
      role: 'customer',
      limit: 20,
      search: search || undefined,
    });
    const { items } = normalizeList<RawRecord>(res, ['customers', 'users']);
    return items.map((u) => ({
      id: getId(u) || String(u.id ?? ''),
      name: String(u.name ?? ''),
      email: (u.email as string | null | undefined) ?? null,
      phone: (u.phone as string | null | undefined) ?? null,
      role: String(u.role ?? 'customer'),
      isActive: u.isActive !== false,
      createdAt: String(u.createdAt ?? new Date().toISOString()),
    }));
  },
};
