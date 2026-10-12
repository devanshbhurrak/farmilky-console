export interface Address {
  id?: string;
  type?: string;
  street?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface DeliveryConfig {
  assignedArea?: string | null;
  assignedAreaName?: string | null;
  deliverySequence?: number | null;
  slot?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  isActive: boolean;
  addresses?: Address[];
  accountBalance?: number;
  pendingAmount?: number;
  totalSpent?: number;
  areaId?: string | null;
  areaName?: string | null;
  deliveryConfig?: DeliveryConfig | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  areaId?: string;
  balance?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LedgerEntry {
  id?: string;
  date: string;
  description: string;
  category?: string;
  type: 'debit' | 'credit';
  amount: number;
  transactionId?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  isEditable?: boolean;
  referenceId?: string | null;
  paymentType?: string | null;
}
