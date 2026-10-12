import { z } from 'zod';

export const generateSchema = z.object({
  userId: z.string().min(1, 'Customer is required'),
  from: z.string().min(1, 'From date is required'),
  to: z.string().min(1, 'To date is required'),
});

export type GenerateInvoiceInput = z.infer<typeof generateSchema>;

export const bulkGenerateSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export type BulkGenerateInput = z.infer<typeof bulkGenerateSchema>;

export const voidSchema = z.object({
  voidReason: z.string().min(1, 'Reason is required'),
});

export type VoidInvoiceInput = z.infer<typeof voidSchema>;
