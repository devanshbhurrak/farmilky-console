import { api } from '@/lib/api-client';

export interface DeliveryBoardParams {
  date?: string;
  slot?: string;
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  area?: string;
  search?: string;
  sort?: string;
}

export interface BoardOutcomeRequest {
  status: string;
  actualQuantity?: number;
  reason?: string;
  notes?: string;
  paymentMode?: string;
  subscriptionId?: string;
  deliveryDate?: string;
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
  recordSubscriptionOutcome: (id: string, data: BoardOutcomeRequest) =>
    api.post<unknown>(`/api/subscriptions/admin/${id}/delivery-outcome`, data, { idempotent: true }),
  recordOrderOutcome: (id: string, data: BoardOutcomeRequest) =>
    api.post<unknown>(`/api/orders/admin/${id}/delivery-outcome`, data, { idempotent: true }),
  instantDelivery: (data: InstantDeliveryRequest) =>
    api.post<unknown>('/api/orders/admin/instant-delivery', data, { idempotent: true }),
  areasLite: () => api.get<unknown>('/api/areas', { limit: 100 }),
  productsLite: () => api.get<unknown>('/api/products', { limit: 100 }),
};
