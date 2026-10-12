export type TransactionType = 'debit' | 'credit';
export type PartyType = 'customer' | 'supplier';

export interface Transaction {
  id: string;
  partyType?: PartyType | string;
  partyId?: string;
  amount: number;
  type: TransactionType | string;
  description?: string | null;
  notes?: string | null;
  date?: string;
  createdAt: string;
}

export interface BalanceSummary {
  customerId?: string;
  userId?: string;
  name?: string;
  phone?: string | null;
  accountBalance?: number;
  balance?: number;
  totalSpent?: number;
  [key: string]: unknown;
}
