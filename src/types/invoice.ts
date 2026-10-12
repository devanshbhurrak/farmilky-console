export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'void';

export interface InvoiceLineItem {
  id?: string;
  date: string;
  description: string;
  productName?: string | null;
  quantity?: number;
  unit?: string | null;
  amount: number;
  entryType?: 'credit' | 'debit' | string;
}

export interface InvoiceProductSummary {
  productName: string;
  variantLabel?: string | null;
  totalQuantity: number;
  unit?: string | null;
  avgRate?: number;
  totalAmount: number;
  paidAmount?: number;
  outstandingAmount?: number;
  rateBreakdown?: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string | { id: string; name: string; phone?: string | null; email?: string | null };
  customerName?: string;
  billingPeriod?: { month: number; year: number };
  previousBalance?: number;
  totalCharges: number;
  orderCredits?: number;
  totalPayments?: number;
  totalAdjustments?: number;
  netAmountDue: number;
  status: InvoiceStatus | string;
  lineItems?: InvoiceLineItem[];
  productSummary?: InvoiceProductSummary[];
  billDate?: string | null;
  sentDate?: string | null;
  paidDate?: string | null;
  replacedByInvoice?: string | null;
  isEarlyBilling?: boolean;
  createdAt: string;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  month?: number;
  year?: number;
  from?: string;
  to?: string;
}

export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'];
