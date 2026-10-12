import { z } from 'zod';

export const returnActionSchema = z.object({
  status: z.enum(['requested', 'approved', 'rejected', 'completed']),
  refundAmount: z.coerce.number().min(0, 'Refund must be 0 or more').optional(),
  adminNotes: z.string().optional(),
});

export type ReturnActionInput = z.infer<typeof returnActionSchema>;
