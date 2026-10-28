import { api } from '@/lib/api-client';
import { getId, normalizeList, unwrapData } from '@/lib/utils';
import type { Area } from '@/types/area';
import type {
  Customer,
  CustomerLedger,
  CustomerListParams,
  LedgerEntry,
  LedgerSummary,
} from '@/types/customer';
import type { Order } from '@/types/order';
import type { Product } from '@/types/product';
import type { Subscription } from '@/types/subscription';

type RawRecord = Record<string, unknown>;

function toAddressArray(o: RawRecord): Customer['addresses'] {
  if (Array.isArray(o.addresses)) return o.addresses as Customer['addresses'];
  if (o.address) return [o.address] as Customer['addresses'];
  return undefined;
}

function toCustomer(raw: unknown): Customer {
  const o = (raw ?? {}) as RawRecord;
  const userObj = (o.user && typeof o.user === 'object' ? o.user : o) as RawRecord;
  const id = getId(userObj) || String(userObj.id ?? '');
  return {
    id,
    name: String(userObj.name ?? ''),
    email: (userObj.email as string | null | undefined) ?? null,
    phone: (userObj.phone as string | null | undefined) ?? null,
    role: String(userObj.role ?? 'customer'),
    isActive: userObj.isActive !== false,
    addresses: toAddressArray(userObj),
    accountBalance: Number(userObj.accountBalance ?? userObj.pendingAmount ?? 0),
    pendingAmount: Number(userObj.pendingAmount ?? userObj.accountBalance ?? 0),
    totalSpent: userObj.totalSpent !== undefined ? Number(userObj.totalSpent) : undefined,
    areaId:
      (userObj.assignedAreaId as string | null | undefined) ??
      (userObj.areaId as string | null | undefined) ??
      null,
    areaName:
      (userObj.areaName as string | null | undefined) ??
      (userObj.deliveryConfig as { assignedAreaName?: string } | null | undefined)?.assignedAreaName ??
      null,
    deliveryConfig:
      (userObj.deliveryConfig as Customer['deliveryConfig']) ??
      (userObj.assignedAreaId !== undefined || userObj.deliverySequence !== undefined
        ? {
            assignedArea:
              (userObj.assignedAreaId as string | null | undefined) ?? undefined,
            deliverySequence:
              userObj.deliverySequence !== undefined
                ? Number(userObj.deliverySequence)
                : undefined,
          }
        : null),
    createdAt: String(userObj.createdAt ?? new Date().toISOString()),
    updatedAt: userObj.updatedAt !== undefined ? String(userObj.updatedAt) : undefined,
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function toLedgerEntry(raw: unknown, index: number): LedgerEntry {
  const o = (raw ?? {}) as RawRecord;
  const amount = Number(o.amount ?? 0);
  const rawType = o.entryType ?? o.type;
  const type: 'debit' | 'credit' =
    rawType !== undefined && rawType !== null
      ? String(rawType).toLowerCase().includes('credit')
        ? 'credit'
        : 'debit'
      : amount < 0
        ? 'credit'
        : 'debit';
  return {
    id: getId(raw) || `ledger-${index}`,
    date: String(o.effectiveDate ?? o.date ?? o.receivedDate ?? o.createdAt ?? new Date().toISOString()),
    description: String(o.description ?? o.notes ?? o.category ?? o.txnCategory ?? 'Entry'),
    category: stringOrNull(o.category) ?? stringOrNull(o.txnCategory) ?? stringOrNull(o.txnType) ?? undefined,
    type,
    amount: Math.abs(Number.isNaN(amount) ? 0 : amount),
    transactionId: stringOrNull(o.paymentRef) ?? stringOrNull(o.transactionId) ?? stringOrNull(o.txnNumber),
    notes: stringOrNull(o.notes),
    recordedBy: o.recordedBy !== undefined ? String(o.recordedBy) : null,
    referenceId: o.referenceId !== undefined ? String(o.referenceId) : null,
    paymentType: stringOrNull(o.paymentMethod) ?? stringOrNull(o.paymentType),
  };
}

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildLedgerSummary(
  raw: unknown,
  entries: LedgerEntry[],
  period: { month: number; year: number; startDate: string; endDate: string },
): LedgerSummary {
  const o = (raw && typeof raw === 'object' ? raw : {}) as RawRecord;
  const computedDebit = entries.filter((e) => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
  const computedCredit = entries.filter((e) => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
  const debit = roundMoney(finiteNumber(o.debit) ?? computedDebit);
  const credit = roundMoney(finiteNumber(o.credit) ?? computedCredit);
  const count = finiteNumber(o.count) ?? entries.length;
  const rawPeriod = (o.period && typeof o.period === 'object' ? o.period : {}) as RawRecord;
  return {
    debit,
    credit,
    net: roundMoney(finiteNumber(o.net) ?? debit - credit),
    count,
    period: {
      month: finiteNumber(rawPeriod.month) ?? period.month,
      year: finiteNumber(rawPeriod.year) ?? period.year,
      startDate: stringOrNull(rawPeriod.startDate) ?? period.startDate,
      endDate: stringOrNull(rawPeriod.endDate) ?? period.endDate,
    },
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

interface CustomerFormData {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
  address?: { street?: string; city?: string; pincode?: string };
  deliveryConfig?: { assignedArea?: string; deliverySequence?: number };
}

function toCustomerPayload(data: unknown, mode: 'create' | 'update'): RawRecord {
  const o = (data ?? {}) as CustomerFormData;
  const payload: RawRecord = {
    name: o.name,
    phone: o.phone,
    email: o.email || undefined,
    role: o.role,
  };
  if (o.password) payload.password = o.password;
  if (mode === 'update') payload.isActive = o.isActive;
  const area = o.deliveryConfig?.assignedArea;
  if (area) payload.assignedAreaId = area;
  const seq = o.deliveryConfig?.deliverySequence;
  if (seq !== undefined && !Number.isNaN(seq)) payload.deliverySequence = seq;
  if (o.address) {
    const { street, city, pincode } = o.address;
    payload.address = { street, city, pincode };
  }
  return payload;
}

export interface RecordPaymentInput {
  userId: string;
  amount: number;
  paymentMethod?: string;
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
    const res = await api.post<unknown>('/api/users/admin/create', toCustomerPayload(data, 'create'));
    return toCustomer(unwrapData<unknown>(res));
  },

  async update(id: string, data: unknown): Promise<Customer> {
    const res = await api.put<unknown>(`/api/users/admin/${id}`, toCustomerPayload(data, 'update'));
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

  /**
   * Entire month ledger in a single request: every transaction plus the
   * debit/credit/net totals. Unlike `passbook` this is not paginated, so the
   * summary always reflects the full month.
   */
  async customerLedger(
    userId: string,
    params: { month?: number; year?: number } = {},
  ): Promise<CustomerLedger> {
    const now = new Date();
    const month = params.month ?? now.getMonth() + 1;
    const year = params.year ?? now.getFullYear();
    const res = await api.get<unknown>(`/api/payments/${userId}/ledger`, { month, year });
    const payload = unwrapData<unknown>(res);
    const obj = (payload && typeof payload === 'object' ? payload : {}) as RawRecord;
    const rawEntries = Array.isArray(obj.entries)
      ? obj.entries
      : Array.isArray(obj.ledger)
        ? obj.ledger
        : [];
    const entries = rawEntries.map(toLedgerEntry);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const period = {
      month,
      year,
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
    return { entries, summary: buildLedgerSummary(obj.summary, entries, period) };
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
