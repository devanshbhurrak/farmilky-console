import { api } from '@/lib/api-client';

export interface DeliveryBoardParams {
  date?: string;
  slot?: string;
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  paymentStatus?: string;
  area?: string;
  search?: string;
  sort?: string;
  sortOrder?: string;
  customerId?: string;
}

export interface BoardOutcomeRequest {
  status: string;
  slot?: 'morning' | 'evening';
  actualQuantity?: number;
  reason?: string;
  notes?: string;
  deliveryDate?: string;
}

/**
 * Unified delivery-outcome request (canonical backend endpoint).
 * Handles subscriptions, one-time orders and instant/rush deliveries through a
 * single idempotent, transactional path — preventing duplicate charges and
 * keeping the delivery record, stock and ledger consistent.
 */
export interface RecordDeliveryOutcomeRequest {
  customerId: string;
  type: 'subscription' | 'order' | 'instant';
  referenceType?: 'subscription' | 'order' | null;
  referenceId?: string | null;
  deliveryDate: string;
  deliverySlot?: 'morning' | 'evening' | null;
  status:
    | 'pending'
    | 'delivered'
    | 'partial'
    | 'extra'
    | 'failed'
    | 'skipped'
    | 'missed';
  scheduledQuantity?: number;
  actualQuantity?: number;
  pricePerPacket?: number;
  items?: Array<{
    productId: string;
    variantId?: string | null;
    productName: string;
    variantLabel?: string | null;
    unit?: string | null;
    quantity: number;
    unitPrice: number;
    deliveredQuantity?: number;
    itemStatus?:
      | 'pending'
      | 'delivered'
      | 'partial'
      | 'extra'
      | 'failed'
      | 'skipped'
      | 'missed';
    failureReason?: string | null;
    failureNotes?: string | null;
  }>;
  paymentMode?: 'pay_at_delivery' | 'subscription_ledger' | 'prepaid' | null;
  reason?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  expectedVersion?: number | null;
  paymentReceived?: {
    amount: number;
    paymentMethod: string;
    paymentRef?: string | null;
  } | null;
}

export interface CorrectDeliveryRequest {
  status?: RecordDeliveryOutcomeRequest['status'];
  actualQuantity?: number;
  scheduledQuantity?: number;
  pricePerPacket?: number;
  reason?: string | null;
  notes?: string | null;
  expectedVersion: number;
}

export interface RescheduleDeliveryRequest {
  newDeliveryDate: string;
  newDeliverySlot?: 'morning' | 'evening' | null;
  reason: string;
  idempotencyKey?: string;
}

export interface CancelDeliveryRequest {
  reason: string;
  restock?: boolean;
}

export interface RecordPaymentRequest {
  amount: number;
  paymentMethod: string;
  paymentRef?: string | null;
  receivedDate?: string | null;
  description?: string | null;
  notes?: string | null;
}

export interface InstantDeliveryRequest {
  customerId: string;
  items: { productId: string; quantity: number; price: number }[];
  paymentMode?: string;
  subscriptionId?: string;
}

export const deliveriesApi = {
  board: (params: DeliveryBoardParams = {}) =>
    api.get<unknown>('/api/subscriptions/admin/delivery-board', {
      date: params.date,
      slot: params.slot,
      page: params.page,
      limit: params.limit,
      type: params.type,
      status: params.status,
      area: params.area,
      search: params.search,
      sort: params.sort,
    }),

  // ── Canonical unified delivery outcome (preferred) ─────────────────────

  recordDeliveryOutcome: (data: RecordDeliveryOutcomeRequest) =>
    api.post<unknown>('/api/deliveries/admin/outcome', data, { idempotent: true }),

  correctDelivery: (id: string, data: CorrectDeliveryRequest) =>
    api.patch<unknown>(`/api/deliveries/admin/${id}/correct`, data),

  rescheduleDelivery: (id: string, data: RescheduleDeliveryRequest) =>
    api.post<unknown>(`/api/deliveries/admin/${id}/reschedule`, data, { idempotent: true }),

  cancelDelivery: (id: string, data: CancelDeliveryRequest) =>
    api.post<unknown>(`/api/deliveries/admin/${id}/cancel`, data),

  recordPayment: (id: string, data: RecordPaymentRequest) =>
    api.post<unknown>(`/api/deliveries/admin/${id}/payment`, data, { idempotent: true }),

  listDeliveries: (params: DeliveryBoardParams = {}) =>
    api.get<unknown>('/api/deliveries/admin', {
      customerId: params.customerId,
      type: params.type,
      status: params.status,
      paymentStatus: params.paymentStatus,
      date: params.date,
      fromDate: undefined,
      toDate: undefined,
      slot: params.slot,
      search: params.search,
      sortBy: params.sort,
      sortOrder: params.sortOrder,
      page: params.page,
      limit: params.limit,
    }),

  customerDeliverySummary: (params: {
    customerId: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    api.get<unknown>('/api/deliveries/admin/summary', {
      customerId: params.customerId,
      fromDate: params.fromDate,
      toDate: params.toDate,
    }),

  markMissedDeliveries: (beforeDate?: string) =>
    api.post<unknown>('/api/deliveries/admin/mark-missed', { beforeDate }),

  // ── Legacy per-module endpoints (kept for backward compatibility) ──────

  recordSubscriptionOutcome: (id: string, data: BoardOutcomeRequest) =>
    api.post<unknown>(`/api/subscriptions/admin/${id}/delivery-outcome`, data, { idempotent: true }),
  recordOrderOutcome: (id: string, data: BoardOutcomeRequest) =>
    api.post<unknown>(`/api/orders/admin/${id}/delivery-outcome`, data, { idempotent: true }),
  instantDelivery: (data: InstantDeliveryRequest) =>
    // Backend instantDeliverySchema expects userId + paymentMethod; items only
    // need productId + quantity (price is resolved server-side).
    api.post<unknown>(
      '/api/orders/admin/instant-delivery',
      {
        userId: data.customerId,
        items: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: data.paymentMode ?? 'COD',
      },
      { idempotent: true },
    ),
  areasLite: () => api.get<unknown>('/api/areas', { limit: 100 }),
  productsLite: () => api.get<unknown>('/api/products', { limit: 100 }),

  // ── Session state (morning/evening availability for a date) ──────────────

  sessionState: (params: { date?: string }) =>
    api.get<{ date: string; isToday: boolean; morningOpen: boolean; eveningOpen: boolean; eveningOpensAt: string }>(
      '/api/deliveries/admin/session-state',
      { date: params.date },
    ),

  // ── Delivery detail ──────────────────────────────────────────────────────

  getDelivery: (id: string) => api.get<unknown>(`/api/deliveries/admin/${id}`),

  // ── Unconfirmed prior-day deliveries (bulk confirmation) ─────────────────

  unconfirmed: (params: { days?: number; slot?: 'morning' | 'evening' }) =>
    api.get<{ fromDate: string; toDate: string; days: number; total: number; items: unknown[] }>(
      '/api/deliveries/admin/unconfirmed',
      { days: params.days, slot: params.slot },
    ),

  confirmUnconfirmed: (params: { days?: number; slot?: 'morning' | 'evening' }) =>
    api.post<{ fromDate: string; toDate: string; days: number; total: number; confirmed: number; failed: number; failures: unknown[] }>(
      '/api/deliveries/admin/unconfirmed/confirm',
      { days: params.days, slot: params.slot },
    ),
};
