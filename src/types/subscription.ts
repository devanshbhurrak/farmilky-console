export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type ScheduleType = 'daily' | 'alternate' | 'weekly' | 'custom';
export type DeliverySlot = 'morning' | 'evening';
export type HistoryStatus = 'delivered' | 'partial' | 'extra' | 'failed' | 'skipped';

export interface Subscription {
  id: string;
  userId: string | { id: string; name: string; phone?: string | null; email?: string | null };
  customerName?: string;
  productId: string | { id: string; name: string; price?: number; unit?: string; image?: string | null };
  productName?: string;
  variantId?: string | null;
  variantLabel?: string | null;
  quantityPerDay: number;
  pricePerUnit: number;
  totalPricePerDay: number;
  status: SubscriptionStatus;
  deliverySchedule: ScheduleType;
  customDays?: string[];
  slot?: DeliverySlot | string;
  startDate: string;
  pauseFrom?: string | null;
  pauseUntil?: string | null;
  pendingAmount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DeliveryHistoryEntry {
  id: string;
  deliveryDate: string;
  status: HistoryStatus | string;
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
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
