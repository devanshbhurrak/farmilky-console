export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Complaint {
  id: string;
  userId?: string | { id: string; name: string; phone?: string | null } | null;
  customerName?: string;
  subject: string;
  description?: string | null;
  category?: string | null;
  relatedTo?: string | null;
  relatedId?: string | null;
  status: ComplaintStatus | string;
  resolution?: string | null;
  createdAt: string;
}

export const COMPLAINT_STATUSES: ComplaintStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
