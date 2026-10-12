export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  description?: string | null;
  paymentMethod?: string | null;
  receiptReference?: string | null;
  recordedBy?: string | null;
  createdAt: string;
}

export interface ExpenseListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export const EXPENSE_CATEGORIES = [
  'fuel_transport',
  'packaging',
  'equipment',
  'salaries',
  'rent',
  'utilities',
  'maintenance',
  'marketing',
  'miscellaneous',
] as const;

export const EXPENSE_PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'other'] as const;
