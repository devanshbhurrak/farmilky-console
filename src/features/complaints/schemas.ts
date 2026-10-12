import { z } from 'zod';

export const complaintSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  relatedTo: z.string().optional(),
  relatedId: z.string().optional(),
  userId: z.string().optional(),
});

export type ComplaintFormInput = z.infer<typeof complaintSchema>;

export const complaintResolutionSchema = z.object({
  resolution: z.string().optional(),
});

export type ComplaintResolutionInput = z.infer<typeof complaintResolutionSchema>;
