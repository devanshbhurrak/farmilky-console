export type CollectionSession = 'morning' | 'evening';

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  pincode?: string | null;
  joiningDate?: string | null;
  collectionSessions?: CollectionSession[] | string[];
  defaultMorningQty?: number;
  defaultEveningQty?: number;
  defaultRatePerLiter?: number;
  outstandingAmount?: number;
  totalPaid?: number;
  isActive: boolean;
  bankDetails?: {
    holderName?: string;
    accountNo?: string;
    ifscCode?: string;
    bankName?: string;
  } | null;
  notes?: string | null;
  createdAt: string;
}

export interface MilkCollection {
  id: string;
  supplierId: string | { id: string; name: string };
  supplierName?: string;
  date: string;
  session: CollectionSession | string;
  expectedQty?: number;
  actualQty?: number | null;
  ratePerLiter?: number;
  fatContent?: number | null;
  snf?: number | null;
  amount?: number;
  status?: string;
  isConfirmed?: boolean;
  notes?: string | null;
  createdAt?: string;
}

export interface SupplierListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  balance?: string;
}

export interface GenerateSummary {
  created: number;
  skipped: number;
  date: string;
}

export interface ShiftSlotSummary {
  confirmed: number;
  total: number;
  qty: number;
  amount: number;
}

export interface TodayShiftSummary {
  morning: ShiftSlotSummary;
  evening: ShiftSlotSummary;
  date: string;
}

export interface ConfirmResult {
  collection: MilkCollection;
  txn: unknown | null;
}

export interface UpdateResult {
  collection: MilkCollection;
  txn: unknown | null;
}

export interface MissingCollection {
  date: string;
  session: CollectionSession;
  supplierId: string;
  supplierName: string;
}
