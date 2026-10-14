import { z } from 'zod';

export const subscriptionSchema = z.object({
  userId: z.string().min(1, 'Customer is required'),
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().optional(),
  quantityPerDelivery: z.coerce.number().min(1, 'Quantity must be at least 1'),
  customPrice: z.coerce.number().min(0, 'Price cannot be negative').optional(),
  startDate: z.string().min(1, 'Start date is required'),
  deliverySchedule: z.enum(['daily', 'alternate', 'weekly', 'custom']),
  customDays: z.array(z.string()).default([]),
  deliverySlot: z.enum(['morning', 'evening']).default('morning'),
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
