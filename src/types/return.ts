export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'completed';

export interface ReturnRequest {
  id: string;
  userId?: string | { id: string; name: string; phone?: string | null } | null;
  customerName?: string;
  orderId?: string | { id: string; totalAmount?: number } | null;
  reason: string;
  status: ReturnStatus | string;
  refundAmount?: number | null;
  adminNotes?: string | null;
  createdAt: string;
}

export const RETURN_STATUSES: ReturnStatus[] = ['requested', 'approved', 'rejected', 'completed'];
