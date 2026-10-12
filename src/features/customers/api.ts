import { api } from '@/lib/api-client';
import { getId, normalizeList, unwrapData } from '@/lib/utils';
import type { Area } from '@/types/area';
import type { Customer, CustomerListParams, LedgerEntry } from '@/types/customer';
import type { Order } from '@/types/order';
import type { Product } from '@/types/product';
import type { Subscription } from '@/types/subscription';

type RawRecord = Record<string, unknown>;

function toCustomer(raw: unknown): Customer {
  const o = (raw ?? {}) as RawRecord;
  const id = getId(raw) || String(o.id ?? '');
  return {
    id,
    name: String(o.name ?? ''),
    email: (o.email as string | null | undefined) ?? null,
    phone: (o.phone as string | null | undefined) ?? null,
    role: String(o.role ?? 'customer'),
    isActive: o.isActive !== false,
    addresses: (o.addresses as Customer['addresses']) ?? (o.address ? [o.address as Customer['addresses'] extends (infer U)[] | undefined ? U : never] : undefined),
    accountBalance: Number(o.accountBalance ?? o.pendingAmount ?? 0),
    pendingAmount: Number(o.pendingAmount ?? o.accountBalance ?? 0),
    totalSpent: o.totalSpent !== undefined ? Number(o.totalSpent) : undefined,
    areaId: (o.areaId as string | null | undefined) ?? null,
    areaName:
      (o.areaName as string | null | undefined) ??
      (o.deliveryConfig as { assignedAreaName?: string } | null | undefined)?.assignedAreaName ??
      null,
    deliveryConfig: (o.deliveryConfig as Customer['deliveryConfig']) ?? null,
    createdAt: String(o.createdAt ?? new Date().toISOString()),
    updatedAt: o.updatedAt !== undefined ? String(o.updatedAt) : undefined,
  };
}

function toLedgerEntry(raw: unknown, index: number): LedgerEntry {
  const o = (raw ?? {}) as RawRecord;
  const amount = Number(o.amount ?? 0);
  const rawType = String(o.type ?? o.entryType ?? (amount < 0 ? 'credit' : 'debit')).toLowerCase();
  const type: 'debit' | 'credit' = rawType.includes('credit') ? 'credit' : 'debit';
  return {
    id: getId(raw) || `ledger-${index}`,
    date: String(o.date ?? o.createdAt ?? new Date().toISOString()),
    description: String(o.description ?? o.notes ?? o.category ?? 'Entry'),
    category: o.category !== undefined ? String(o.category) : undefined,
    type,
    amount: Math.abs(Number.isNaN(amount) ? 0 : amount),
    transactionId: (o.transactionId as string | null | undefined) ?? null,
    notes: (o.notes as string | null | undefined) ?? null,
    recordedBy: o.recordedBy !== undefined ? String(o.recordedBy) : null,
    referenceId: o.referenceId !== undefined ? String(o.referenceId) : null,
    paymentType: o.paymentType !== undefined ? String(o.paymentType) : null,
  };
}

function unwrapArray<T>(response: unknown, nestedKeys: string[] = []): T[] {
  if (Array.isArray(response)) return response as T[];
  if (!response || typeof response !== 'object') return [];
  const root = response as RawRecord;
  const data = (root.data ?? root.result ?? response) as unknown;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as RawRecord;
    for (const k of [...nestedKeys, 'subscriptions', 'items', 'data', 'results', 'entries', 'list']) {
      if (Array.isArray(obj[k])) return obj[k] as T[];
    }
  }
  return [];
}

export interface RecordPaymentInput {
  userId: string;
  amount: number;
  type?: string;
  date?: string;
  transactionId?: string;
  notes?: string;
}

export interface RecordAdjustmentInput {
  type?: string;
  amount: number;
  date?: string;
  notes?: string;
}

export const customersApi = {
  async list(params: CustomerListParams = {}): Promise<{
    items: Customer[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get<unknown>('/api/users/admin/all', {
      ...(params as Record<string, string | number | boolean | null | undefined>),
      role: 'customer',
    });
    const { items, meta } = normalizeList<unknown>(res, ['customers']);
    return { items: items.map(toCustomer), meta };
  },

  async get(id: string): Promise<Customer> {
    const res = await api.get<unknown>(`/api/users/admin/${id}`);
    return toCustomer(unwrapData<unknown>(res));
  },

  async create(data: unknown): Promise<Customer> {
    const res = await api.post<unknown>('/api/users/admin/create', data);
    return toCustomer(unwrapData<unknown>(res));
  },

  async update(id: string, data: unknown): Promise<Customer> {
    const res = await api.put<unknown>(`/api/users/admin/${id}`, data);
    return toCustomer(unwrapData<unknown>(res));
  },

  async updateDeliveryConfig(id: string, data: unknown): Promise<Customer> {
    const res = await api.put<unknown>(`/api/users/admin/${id}/delivery-config`, data);
    return toCustomer(unwrapData<unknown>(res));
  },

  async activeSubscriptions(userId: string): Promise<Subscription[]> {
    const res = await api.get<unknown>(`/api/subscriptions/admin/user/${userId}/active`);
    return unwrapArray<Subscription>(res).map((s) => {
      const o = s as unknown as RawRecord;
      return { ...(s as object), id: getId(s) || String(o.id ?? '') } as Subscription;
    });
  },

  async passbook(
    userId: string,
    params: { month?: number; year?: number } = {},
  ): Promise<LedgerEntry[]> {
    const res = await api.get<unknown>(`/api/payments/${userId}`, {
      month: params.month,
      year: params.year,
    });
    return unwrapArray<unknown>(res, ['ledger', 'payments']).map(toLedgerEntry);
  },

  async recordPayment(data: RecordPaymentInput): Promise<unknown> {
    const res = await api.post<unknown>('/api/payments/admin/record', data);
    return unwrapData<unknown>(res);
  },

  async recordAdjustment(userId: string, data: RecordAdjustmentInput): Promise<unknown> {
    const res = await api.post<unknown>(`/api/users/admin/${userId}/adjustments`, data);
    return unwrapData<unknown>(res);
  },

  async customerOrders(userId: string): Promise<Order[]> {
    const res = await api.get<unknown>('/api/orders/admin/all', { customerId: userId, limit: 50 });
    const { items } = normalizeList<unknown>(res, ['orders']);
    return items.map((o) => {
      const r = o as RawRecord;
      return { ...(o as object), id: getId(o) || String(r.id ?? '') } as Order;
    });
  },

  async areasLite(): Promise<Area[]> {
    const res = await api.get<unknown>('/api/areas');
    return normalizeList<Area>(res, ['areas']).items;
  },

  async productsLite(): Promise<Product[]> {
    const res = await api.get<unknown>('/api/products', { limit: 100 });
    return normalizeList<Product>(res, ['products']).items;
  },
};
