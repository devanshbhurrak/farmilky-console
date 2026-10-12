import { z } from 'zod';

export const confirmSchema = z.object({
  actualQty: z.coerce.number().min(0, 'Quantity must be 0 or more'),
  ratePerLiter: z.coerce.number().min(0, 'Rate must be 0 or more'),
  fatContent: z.coerce.number().min(0, 'Fat must be 0 or more').max(100, 'Fat cannot exceed 100').optional(),
  snf: z.coerce.number().min(0, 'SNF must be 0 or more').max(100, 'SNF cannot exceed 100').optional(),
  notes: z.string().optional(),
});

export type ConfirmCollectionFormInput = z.infer<typeof confirmSchema>;

export const collectionSchema = confirmSchema.extend({
  supplierId: z.string().min(1, 'Supplier is required'),
  date: z.string().min(1, 'Date is required'),
  session: z.enum(['morning', 'evening']),
});

export type CollectionFormInput = z.infer<typeof collectionSchema>;
