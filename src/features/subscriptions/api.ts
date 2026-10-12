import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { DeliveryHistoryEntry, Subscription, SubscriptionListParams } from '@/types/subscription';

export interface PendingScheduleChange {
  effectiveDate?: string;
  deliverySchedule?: string;
  quantityPerDay?: number;
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
  quantityPerDay: number;
  pricePerUnit: number;
  startDate: string;
  deliverySchedule: 'daily' | 'alternate' | 'weekly' | 'custom';
  customDays?: string[];
  slot?: 'morning' | 'evening';
}

export interface ScheduleChangeRequest {
  effectiveDate: string;
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
  create: (data: CreateSubscriptionRequest) =>
    api.post<ApiResponse<Subscription>>('/api/subscriptions/admin/create', data, { idempotent: true }),
  update: (id: string, data: Partial<CreateSubscriptionRequest>) =>
    api.put<ApiResponse<Subscription>>(`/api/subscriptions/admin/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.put<ApiResponse<Subscription>>(`/api/subscriptions/admin/${id}/status`, { status }),
  bulkPause: (ids: string[], extra?: { pauseFrom?: string; pauseUntil?: string }) =>
    api.put<ApiResponse<unknown>>('/api/subscriptions/admin/bulk-pause', { ids, ...(extra ?? {}) }),
  bulkResume: (ids: string[]) =>
    api.put<ApiResponse<unknown>>('/api/subscriptions/admin/bulk-resume', { ids }),
  scheduleChange: (id: string, data: ScheduleChangeRequest) =>
    api.put<ApiResponse<Subscription>>(`/api/subscriptions/admin/${id}/schedule-change`, data),
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
