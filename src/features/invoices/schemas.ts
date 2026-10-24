import { z } from 'zod';

export const generateSchema = z.object({
  userId: z.string().min(1, 'Customer is required'),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Billing month is required'),
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
