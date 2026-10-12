import { z } from 'zod';

export const collectPaymentSchema = z.object({
  userId: z.string().min(1, 'Customer is required'),
  amount: z.coerce.number().gt(0, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  receivedDate: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;

export const adjustSchema = z.object({
  userId: z.string().min(1, 'Customer is required'),
  type: z.enum(['credit_adjustment', 'debit_adjustment']),
  amount: z.coerce.number().gt(0, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

export type AdjustInput = z.infer<typeof adjustSchema>;

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required'),
  amount: z.coerce.number().gt(0, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi']),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
