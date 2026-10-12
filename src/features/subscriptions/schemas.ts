import { z } from 'zod';

export const subscriptionSchema = z.object({
  userId: z.string().min(1, 'Customer is required'),
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().optional(),
  quantityPerDay: z.coerce.number().min(1, 'Quantity must be at least 1'),
  pricePerUnit: z.coerce.number().min(0, 'Price cannot be negative'),
  startDate: z.string().min(1, 'Start date is required'),
  deliverySchedule: z.enum(['daily', 'alternate', 'weekly', 'custom']),
  customDays: z.array(z.string()).default([]),
  slot: z.enum(['morning', 'evening']).default('morning'),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export const outcomeSchema = z.object({
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  status: z.enum(['delivered', 'partial', 'extra', 'failed', 'skipped']),
  actualQuantity: z.coerce.number().min(0).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export type SubscriptionOutcomeInput = z.infer<typeof outcomeSchema>;
