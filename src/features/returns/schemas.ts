import { z } from 'zod';

export const returnActionSchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'completed']),
    refundAmount: z.coerce.number().positive('Refund must be greater than 0').optional(),
    adminNotes: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if ((val.status === 'approved' || val.status === 'completed') && val.refundAmount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Refund amount is required for approved or completed returns',
        path: ['refundAmount'],
      });
    }
  });

export type ReturnActionInput = z.infer<typeof returnActionSchema>;
