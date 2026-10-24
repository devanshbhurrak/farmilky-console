import { z } from 'zod';

export const COMPLAINT_RELATED_TO = ['order', 'subscription', 'delivery', 'product', 'other'] as const;
export const COMPLAINT_REFERENCE_TYPES = [
  'order',
  'subscription',
  'delivery_manifest',
  'product',
] as const;

export const complaintSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  description: z.string().trim().min(1, 'Description is required'),
  relatedTo: z.enum(COMPLAINT_RELATED_TO).default('other'),
  referenceType: z.enum(COMPLAINT_REFERENCE_TYPES).optional(),
  referenceId: z.string().uuid('Reference ID must be a valid id').optional().or(z.literal('')),
});

export type ComplaintFormInput = z.infer<typeof complaintSchema>;

export const complaintResolutionSchema = z.object({
  resolution: z.string().optional(),
});

export type ComplaintResolutionInput = z.infer<typeof complaintResolutionSchema>;
