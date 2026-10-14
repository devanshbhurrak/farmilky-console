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
  quantityPerDay?: number;
  pricePerUnit?: number;
  slot?: 'morning' | 'evening';
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
    const payload = {
      userId: data.userId,
      productId: data.productId,
      variantId: data.variantId,
      quantityPerDelivery: data.quantityPerDelivery ?? data.quantityPerDay,
      customPrice: data.customPrice ?? (data.pricePerUnit && data.pricePerUnit > 0 ? data.pricePerUnit : undefined),
      startDate: data.startDate,
      deliverySchedule: data.deliverySchedule,
      customDays: data.customDays ?? [],
      deliverySlot: data.deliverySlot ?? data.slot ?? 'morning',
    };
    return api.post<ApiResponse<Subscription>>('/api/subscriptions/admin/create', payload, { idempotent: true });
  },
  update: (id: string, data: Partial<CreateSubscriptionRequest>) => {
    const payload: Record<string, unknown> = {};
    if (data.productId !== undefined) payload.productId = data.productId;
    if (data.variantId !== undefined) payload.variantId = data.variantId;
    if (data.quantityPerDelivery !== undefined || data.quantityPerDay !== undefined) {
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
