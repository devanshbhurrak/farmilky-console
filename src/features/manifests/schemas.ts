import { z } from 'zod';

export const generateSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  slot: z.string().optional(),
});

export type GenerateManifestInput = z.infer<typeof generateSchema>;

export const entryUpdateSchema = z
  .object({
    // Backend updateEntrySchema accepts delivered|partial|extra|failed|skipped;
    // pending is not a valid update target.
    status: z.enum(['delivered', 'failed', 'skipped']),
    notes: z.string().optional(),
    failureReason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'failed' && !values.failureReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['failureReason'],
        message: 'Failure reason is required when status is failed',
      });
    }
  });

export type ManifestEntryUpdateInput = z.infer<typeof entryUpdateSchema>;
