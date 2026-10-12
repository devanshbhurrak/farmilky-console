export type PaymentEntryType = 'debit' | 'credit';

export interface Payment {
  id: string;
  userId?: string;
  customerName?: string;
  amount: number;
  type?: PaymentEntryType | string;
  method?: string;
  paymentMethod?: string;
  transactionId?: string | null;
  date?: string;
  receivedDate?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  createdAt: string;
}

export interface PaymentListParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  method?: string;
  from?: string;
  to?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName?: string;
  amount: number;
  fromDate?: string | null;
  toDate?: string | null;
  paymentMethod?: string;
  transactionRef?: string | null;
  notes?: string | null;
  date?: string;
  createdAt: string;
}

export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'online', 'COD', 'other'] as const;
