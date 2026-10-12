import { z } from 'zod';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@/types/expense';

export const expenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  category: z.enum(EXPENSE_CATEGORIES),
  date: z.string().min(1, 'Date is required'),
  description: z.string().trim().optional().default(''),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).default('cash'),
  receiptReference: z.string().trim().optional().default(''),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
