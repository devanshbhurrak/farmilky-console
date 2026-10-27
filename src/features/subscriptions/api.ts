import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { DeliveryHistoryEntry, Subscription, SubscriptionListParams } from '@/types/subscription';

export interface PendingScheduleChange {
  effectiveDate?: string;
  deliverySchedule?: string;
  quantityPerDelivery?: number;
  quantityPerDay?: number;
  scheduledQty?: number;
  scheduledPrice?: number;
  deliverySlot?: string;
  slot?: string;
  status?: string;
}

export interface SubscriptionDetail extends Subscription {
  history?: DeliveryHistoryEntry[];
  deliveries?: DeliveryHistoryEntry[];
  pendingScheduleChange?: PendingScheduleChange | null;
  pendingChange?: PendingScheduleChange | null;
  nextDeliveryDate?: string | null;
  thisMonthCharges?: number | null;
  totalDeliveries?: number | null;
  deliveredCount?: number | null;
}

export interface SubscriptionSlotInput {
  slot: 'morning' | 'evening';
  quantityPerDelivery?: number;
}

// Slot rows (per-slot quantities) are attached by the backend detail endpoint
// as `slots` on the subscription. Falls back to the legacy single-slot fields
// when no rows exist.
export function slotConfigOf(sub: {
  slots?: unknown;
  deliverySlot?: string;
  quantityPerDelivery?: number | string;
}): Array<{ slot: 'morning' | 'evening'; quantityPerDelivery: number }> {
  const rows = Array.isArray(sub.slots)
    ? (sub.slots as Array<{ deliverySlot?: string; quantityPerDelivery?: string | number }>)
    : [];
  if (rows.length > 0) {
    return rows.map((r) => ({
      slot: r.deliverySlot === 'evening' ? 'evening' : 'morning',
      quantityPerDelivery: Number(r.quantityPerDelivery ?? 0),
    }));
  }
  const primary = sub.deliverySlot === 'evening' ? 'evening' : 'morning';
  return [{ slot: primary, quantityPerDelivery: Number(sub.quantityPerDelivery ?? 1) }];
}

export interface CreateSubscriptionRequest {
  userId: string;
  productId: string;
  variantId?: string;
  quantityPerDelivery: number;
  customPrice?: number;
  startDate: string;
  deliverySchedule: 'daily' | 'alternate' | 'weekly' | 'custom';
  customDays?: string[];
  deliverySlot?: 'morning' | 'evening';
  // Multi-slot config; takes precedence over deliverySlot when present.
  deliverySlots?: SubscriptionSlotInput[];
  // Form shape (from SubscriptionInput): selected slots + per-slot quantities.
  slots?: string[];
  slotQuantities?: { morning?: number; evening?: number };
  quantityPerDay?: number;
  pricePerUnit?: number;
  slot?: 'morning' | 'evening';
}

// Convert the form's `slots` + `slotQuantities` shape into the backend's
// `deliverySlots` array. Returns undefined when the request carries no
// multi-slot info, so legacy callers keep their old payloads.
function toDeliverySlots(
  data: Pick<CreateSubscriptionRequest, 'slots' | 'slotQuantities' | 'deliverySlots'>,
): SubscriptionSlotInput[] | undefined {
  if (data.deliverySlots && data.deliverySlots.length > 0) return data.deliverySlots;
  if (!data.slots || data.slots.length === 0) return undefined;
  return data.slots
    .filter((s): s is 'morning' | 'evening' => s === 'morning' || s === 'evening')
    .map((slot) => ({
      slot,
      quantityPerDelivery: data.slotQuantities?.[slot],
    }));
}

export interface ScheduleChangeRequest {
  effectiveDate: string;
  scheduledQty?: number;
  scheduledPrice?: number;
  deliverySchedule?: string;
  quantityPerDay?: number;
  slot?: string;
}

export interface SubscriptionOutcomeRequest {
  deliveryDate: string;
  // Required for multi-slot subscriptions.
  slot?: 'morning' | 'evening';
  status: 'delivered' | 'partial' | 'extra' | 'failed' | 'skipped';
  actualQuantity?: number;
  reason?: string;
  notes?: string;
}

export interface HistoryQuery {
  month?: string | number;
  year?: string | number;
}

export const subscriptionsApi = {
  list: (params: SubscriptionListParams = {}) =>
    api.get<PaginatedResponse<Subscription>>('/api/subscriptions/admin/all', {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      productId: params.productId,
      schedule: params.schedule,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),
  get: (id: string) => api.get<ApiResponse<SubscriptionDetail>>(`/api/subscriptions/admin/${id}`),
  create: (data: CreateSubscriptionRequest) => {
    const customPrice = data.customPrice ?? data.pricePerUnit;
    // Backend accepts an optional `deliverySlots` array (per-slot quantities);
    // when present it takes precedence over the single `deliverySlot`.
    const deliverySlots = toDeliverySlots(data);
    const payload = {
      userId: data.userId,
      productId: data.productId,
      variantId: data.variantId,
      quantityPerDelivery: data.quantityPerDelivery,
      customPrice: customPrice && customPrice > 0 ? customPrice : undefined,
      startDate: data.startDate,
      deliverySchedule: data.deliverySchedule,
      customDays: data.customDays ?? [],
      deliverySlot: deliverySlots?.[0]?.slot ?? data.deliverySlot ?? data.slot ?? 'morning',
      ...(deliverySlots ? { deliverySlots } : {}),
    };
    return api.post<ApiResponse<Subscription>>('/api/subscriptions/admin/create', payload, { idempotent: true });
  },
  update: (id: string, data: Partial<CreateSubscriptionRequest>) => {
    const payload: Record<string, unknown> = {};
    if (data.productId !== undefined) payload.productId = data.productId;
    if (data.variantId !== undefined) payload.variantId = data.variantId;
    // Multi-slot subscriptions must update quantities per slot; the backend
    // rejects a plain quantityPerDelivery for them.
    const deliverySlots = toDeliverySlots(data);
    if (deliverySlots && deliverySlots.length > 0) {
      payload.deliverySlots = deliverySlots;
    } else if (data.quantityPerDelivery !== undefined || data.quantityPerDay !== undefined) {
      payload.quantityPerDelivery = data.quantityPerDelivery ?? data.quantityPerDay;
    }
    if (data.deliverySlot !== undefined || data.slot !== undefined) {
      payload.deliverySlot = data.deliverySlot ?? data.slot;
    }
    if (data.deliverySchedule !== undefined) payload.deliverySchedule = data.deliverySchedule;
    if (data.customDays !== undefined) payload.customDays = data.customDays;
    if (data.customPrice !== undefined || data.pricePerUnit !== undefined) {
      const p = data.customPrice ?? data.pricePerUnit;
      if (p !== undefined && p > 0) payload.pricePerPacket = p;
    }
    return api.put<ApiResponse<Subscription>>(`/api/subscriptions/admin/${id}`, payload);
  },
  updateStatus: (id: string, status: string) =>
    api.put<ApiResponse<Subscription>>(`/api/subscriptions/admin/${id}/status`, { status }),
  bulkPause: (ids: string[], extra?: { pauseFrom?: string; pauseUntil?: string }) =>
    api.put<ApiResponse<unknown>>('/api/subscriptions/admin/bulk-pause', { subscriptionIds: ids, ...(extra ?? {}) }),
  bulkResume: (ids: string[]) =>
    api.put<ApiResponse<unknown>>('/api/subscriptions/admin/bulk-resume', { subscriptionIds: ids }),
  scheduleChange: (id: string, data: ScheduleChangeRequest) => {
    const payload: Record<string, unknown> = {
      effectiveDate: data.effectiveDate,
    };
    const qty = data.scheduledQty ?? data.quantityPerDay;
    if (qty !== undefined) payload.scheduledQty = qty;
    if (data.scheduledPrice !== undefined) payload.scheduledPrice = data.scheduledPrice;
    // Multi-slot subscriptions require a target slot for scheduledQty.
    if (data.slot !== undefined) payload.slot = data.slot;
    return api.put<ApiResponse<Subscription>>(`/api/subscriptions/admin/${id}/schedule-change`, payload);
  },
  cancelScheduleChange: (id: string) =>
    api.delete<ApiResponse<unknown>>(`/api/subscriptions/admin/${id}/schedule-change`),
  recordOutcome: (id: string, data: SubscriptionOutcomeRequest) =>
    api.post<ApiResponse<unknown>>(`/api/subscriptions/admin/${id}/delivery-outcome`, data, {
      idempotent: true,
    }),
  deleteEntry: (id: string, entryId: string) =>
    api.delete<ApiResponse<unknown>>(`/api/subscriptions/admin/${id}/delivery/${entryId}`),
  history: (id: string, params: HistoryQuery = {}) =>
    api.get<unknown>(`/api/subscriptions/admin/${id}/history`, {
      month: params.month,
      year: params.year,
    }),
  productsLite: () => api.get<unknown>('/api/products', { limit: 100 }),
  customersLite: (search?: string) =>
    api.get<unknown>('/api/users/admin/all', {
      role: 'customer',
      limit: 20,
      search: search && search.length > 0 ? search : undefined,
    }),
};
