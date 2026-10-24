import { api } from '@/lib/api-client';
import { getId, normalizeList, unwrapData } from '@/lib/utils';
import type { LedgerEntry } from '@/types/customer';
import type { Supplier, SupplierListParams } from '@/types/supplier';

type RawRecord = Record<string, unknown>;

export function toSupplier(raw: unknown): Supplier {
  const o = (raw ?? {}) as RawRecord;
  const sessions: string[] = Array.isArray(o.collectionSessions)
    ? (o.collectionSessions as string[])
    : [
        ...(o.morningSession !== false ? ['morning'] : []),
        ...(o.eveningSession === true ? ['evening'] : []),
      ];
  const flatBank =
    o.bankAccountNo || o.bankIfsc || o.bankName || o.bankHolderName
      ? {
          accountNo: (o.bankAccountNo as string | null | undefined) ?? undefined,
          ifscCode: (o.bankIfsc as string | null | undefined) ?? undefined,
          bankName: (o.bankName as string | null | undefined) ?? undefined,
          holderName: (o.bankHolderName as string | null | undefined) ?? undefined,
        }
      : null;
  return {
    id: getId(raw) || String(o.id ?? ''),
    name: String(o.name ?? ''),
    phone: (o.phone as string | null | undefined) ?? null,
    email: (o.email as string | null | undefined) ?? null,
    location: (o.location as string | null | undefined) ?? null,
    pincode: (o.pincode as string | null | undefined) ?? null,
    joiningDate: o.joiningDate !== undefined ? String(o.joiningDate) : null,
    collectionSessions: sessions,
    defaultMorningQty: o.defaultMorningQty !== undefined ? Number(o.defaultMorningQty) : undefined,
    defaultEveningQty:
      o.defaultEveningQty !== undefined
        ? Number(o.defaultEveningQty)
        : o.expectedEveningQty !== undefined
          ? Number(o.expectedEveningQty)
          : undefined,
    defaultRatePerLiter: o.defaultRatePerLiter !== undefined ? Number(o.defaultRatePerLiter) : undefined,
    outstandingAmount: o.outstandingAmount !== undefined ? Number(o.outstandingAmount) : undefined,
    totalPaid: o.totalPaid !== undefined ? Number(o.totalPaid) : undefined,
    isActive: o.isActive !== false,
    bankDetails: (o.bankDetails as Supplier['bankDetails']) ?? flatBank,
    notes: (o.notes as string | null | undefined) ?? null,
    createdAt: String(o.createdAt ?? new Date().toISOString()),
  };
}

/** Flatten the form shape (sessions + nested bank details) for the backend. */
function toSupplierPayload(data: unknown): RawRecord {
  const o = (data ?? {}) as RawRecord;
  const bank = (o.bankDetails ?? {}) as RawRecord;
  const sessions = Array.isArray(o.collectionSessions) ? (o.collectionSessions as string[]) : [];
  return {
    name: o.name,
    phone: o.phone,
    email: o.email || undefined,
    location: o.location || undefined,
    pincode: o.pincode || undefined,
    joiningDate: o.joiningDate || undefined,
    morningSession: sessions.includes('morning'),
    eveningSession: sessions.includes('evening'),
    defaultMorningQty: o.defaultMorningQty,
    expectedEveningQty: o.defaultEveningQty,
    defaultRatePerLiter: o.defaultRatePerLiter,
    bankAccountNo: bank.accountNo || undefined,
    bankIfsc: bank.ifscCode || undefined,
    bankName: bank.bankName || undefined,
    bankHolderName: bank.holderName || undefined,
    notes: o.notes || undefined,
  };
}

function toPassbookEntry(raw: unknown, index: number): LedgerEntry {
  const o = (raw ?? {}) as RawRecord;
  const amount = Number(o.amount ?? 0);
  const rawType = String(o.type ?? o.entryType ?? (amount < 0 ? 'credit' : 'debit')).toLowerCase();
  return {
    id: getId(raw) || `supplier-ledger-${index}`,
    date: String(o.date ?? o.createdAt ?? new Date().toISOString()),
    description: String(o.description ?? o.notes ?? o.category ?? 'Entry'),
    category: o.category !== undefined ? String(o.category) : undefined,
    type: rawType.includes('credit') ? 'credit' : 'debit',
    amount: Math.abs(Number.isNaN(amount) ? 0 : amount),
    transactionId: ((o.transactionId as string | null | undefined) ?? (o.transactionRef as string | null | undefined)) ?? null,
    notes: (o.notes as string | null | undefined) ?? null,
  };
}

export interface SupplierPaymentInput {
  supplierId: string;
  amount: number;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: string;
  transactionRef?: string;
  notes?: string;
}

export interface SupplierAdjustmentInput {
  type: 'debit' | 'credit';
  category?: 'advance' | 'transport' | 'quality_bonus' | 'quality_penalty' | 'rounding' | 'other';
  amount: number;
  date?: string;
  description?: string;
}

export const suppliersApi = {
  async list(params: SupplierListParams = {}): Promise<{
    items: Supplier[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get<unknown>('/api/suppliers', {
      ...(params as Record<string, string | number | boolean | null | undefined>),
    });
    const { items, meta } = normalizeList<unknown>(res, ['suppliers']);
    return { items: items.map(toSupplier), meta };
  },

  async get(id: string): Promise<Supplier> {
    const res = await api.get<unknown>(`/api/suppliers/${id}`);
    return toSupplier(unwrapData<unknown>(res));
  },

  async create(data: unknown): Promise<Supplier> {
    const wantsActive = (data as { isActive?: boolean } | null)?.isActive;
    const res = await api.post<unknown>('/api/suppliers', toSupplierPayload(data));
    const created = toSupplier(unwrapData<unknown>(res));
    if (wantsActive === false) {
      await api.patch<unknown>(`/api/suppliers/${created.id}/status`, { isActive: false });
      return { ...created, isActive: false };
    }
    return created;
  },

  async update(id: string, data: unknown): Promise<Supplier> {
    const wantsActive = (data as { isActive?: boolean } | null)?.isActive;
    const res = await api.put<unknown>(`/api/suppliers/${id}`, toSupplierPayload(data));
    const updated = toSupplier(unwrapData<unknown>(res));
    if (wantsActive !== undefined && wantsActive !== updated.isActive) {
      await api.patch<unknown>(`/api/suppliers/${id}/status`, { isActive: wantsActive });
      return { ...updated, isActive: wantsActive };
    }
    return updated;
  },

  async remove(id: string): Promise<void> {
    await api.delete<unknown>(`/api/suppliers/${id}`);
  },

  async setStatus(id: string, isActive: boolean): Promise<Supplier> {
    const res = await api.patch<unknown>(`/api/suppliers/${id}/status`, { isActive });
    const data = unwrapData<unknown>(res) as RawRecord | null;
    return toSupplier(data?.supplier ?? data);
  },

  async passbook(id: string): Promise<LedgerEntry[]> {
    try {
      const res = await api.get<unknown>(`/api/suppliers/${id}/passbook`);
      if (!res || typeof res !== 'object') return [];
      const root = res as RawRecord;
      const payload = (root.data ?? root) as unknown;
      const arr = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object' && Array.isArray((payload as RawRecord).entries)
          ? ((payload as RawRecord).entries as unknown[])
          : [];
      return arr.map(toPassbookEntry);
    } catch {
      return [];
    }
  },

  async collectionTotal(supplierId: string, from?: string, to?: string): Promise<{ total: number }> {
    try {
      const res = await api.get<RawRecord | number>('/api/supplier-payments/collection-total', {
        supplierId,
        startDate: from || undefined,
        endDate: to || undefined,
      });
      const data = unwrapData<RawRecord | number>(res);
      if (typeof data === 'number') return { total: data };
      if (data && typeof data === 'object') {
        const total = data.total ?? data.amount ?? data.collectionTotal;
        if (typeof total === 'number') return { total };
        if (typeof total === 'string' && !Number.isNaN(Number(total))) return { total: Number(total) };
      }
      return { total: 0 };
    } catch {
      return { total: 0 };
    }
  },

  async recordSupplierPayment(data: SupplierPaymentInput): Promise<unknown> {
    const res = await api.post<unknown>('/api/supplier-payments', {
      supplierId: data.supplierId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentRef: data.transactionRef || undefined,
      notes: data.notes || undefined,
    });
    return unwrapData<unknown>(res);
  },

  /** Alias kept for backwards compatibility. */
  async recordPayment(data: SupplierPaymentInput): Promise<unknown> {
    return suppliersApi.recordSupplierPayment(data);
  },

  async recordAdjustment(id: string, data: SupplierAdjustmentInput): Promise<unknown> {
    const res = await api.post<unknown>(`/api/suppliers/${id}/adjustments`, {
      amount: data.amount,
      entryType: data.type,
      category: data.category ?? 'other',
      effectiveDate: data.date || undefined,
      description: data.description || data.category || 'Adjustment',
    });
    return unwrapData<unknown>(res);
  },
};
