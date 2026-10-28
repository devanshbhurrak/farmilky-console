export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type ScheduleType = 'daily' | 'alternate' | 'weekly' | 'custom';
export type DeliverySlot = 'morning' | 'evening';
export type HistoryStatus = 'delivered' | 'partial' | 'extra' | 'failed' | 'skipped';

export interface Subscription {
  id: string;
  userId: string | { id: string; name: string; phone?: string | null; email?: string | null };
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  productId: string | { id: string; name: string; price?: number; basePrice?: number | null; unit?: string; image?: string | null; imageUrl?: string | null };
  productName?: string;
  variantId?: string | null;
  variantLabel?: string | null;
  quantityPerDelivery: number;
  pricePerPacket: number;
  totalPricePerDelivery: number;
  status: SubscriptionStatus;
  deliverySchedule: ScheduleType;
  customDays?: string[];
  deliverySlot?: DeliverySlot | string;
  // Per-slot config rows (multi-slot subscriptions). Rows look like
  // { deliverySlot, quantityPerDelivery }.
  slots?: Array<{ deliverySlot?: string; quantityPerDelivery?: string | number }>;
  startDate: string;
  pauseFrom?: string | null;
  pauseUntil?: string | null;
  pendingAmount?: number;
  scheduledChangeDate?: string | null;
  scheduledQty?: number | null;
  scheduledPrice?: number | null;
  scheduledSlot?: DeliverySlot | null;
  scheduledDeliverySchedule?: ScheduleType | null;
  scheduledCustomDays?: string[] | null;
  createdAt: string;
  updatedAt?: string;
  // Backward compatibility aliases
  quantityPerDay?: number;
  pricePerUnit?: number;
  totalPricePerDay?: number;
  slot?: DeliverySlot | string;
}

export interface DeliveryHistoryEntry {
  id: string;
  deliveryDate: string;
  status: HistoryStatus | string;
  slot?: DeliverySlot | string;
  deliverySlot?: DeliverySlot | string;
  quantity?: number;
  actualQuantity?: number;
  rate?: number;
  amount?: number;
  notes?: string | null;
  reason?: string | null;
}

export interface SubscriptionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  productId?: string;
  schedule?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'paused', 'cancelled'];
export const SCHEDULE_TYPES: ScheduleType[] = ['daily', 'alternate', 'weekly', 'custom'];
export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
