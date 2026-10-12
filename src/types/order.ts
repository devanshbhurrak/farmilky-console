export type OrderStatus = 'placed' | 'confirmed' | 'delivered' | 'cancelled';
export type PaymentMethod = 'COD' | 'online' | 'upi' | 'cash' | 'bank_transfer' | 'card' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'partial' | 'unpaid';
export type DeliveryOutcome = 'delivered' | 'partial' | 'extra' | 'failed' | 'skipped';

export interface OrderItem {
  productId: string;
  variantId?: string | null;
  productName?: string;
  name?: string;
  variantLabel?: string | null;
  quantity: number;
  price: number;
  unit?: string;
  lineTotal?: number;
}

export interface OrderCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface Order {
  id: string;
  userId: string | OrderCustomer;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  orderStatus: OrderStatus;
  status?: OrderStatus;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus | string;
  transactionId?: string | null;
  orderDate?: string | null;
  deliveryDate?: string | null;
  address?: OrderAddress | string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
}

export interface OrderAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const ORDER_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'delivered', 'cancelled'];
