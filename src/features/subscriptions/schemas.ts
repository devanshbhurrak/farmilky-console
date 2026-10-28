import { z } from 'zod';

export const subscriptionSchema = z
  .object({
    userId: z.string().min(1, 'Customer is required'),
    productId: z.string().min(1, 'Product is required'),
    variantId: z.string().optional(),
    quantityPerDelivery: z.coerce.number().min(0.001, 'Quantity must be at least 0.001'),
    customPrice: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z.coerce.number().min(0.01, 'Price must be at least 0.01').optional(),
    ),
    startDate: z.string().min(1, 'Start date is required'),
    deliverySchedule: z.enum(['daily', 'alternate', 'weekly', 'custom']),
    customDays: z.array(z.string()).default([]),
    // Legacy single-slot field; kept as the primary slot for payloads.
    deliverySlot: z.enum(['morning', 'evening']).default('morning'),
    // Multi-slot selection: one or both of morning/evening.
    slots: z.array(z.enum(['morning', 'evening'])).min(1, 'Select at least one slot').default(['morning']),
    // Per-slot quantities, required for each selected slot when multiple slots
    // are chosen; single-slot subscriptions use quantityPerDelivery.
    slotQuantities: z
      .object({
        morning: z.coerce.number().min(0.001, 'Quantity must be at least 0.001').optional(),
        evening: z.coerce.number().min(0.001, 'Quantity must be at least 0.001').optional(),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    const slots = v.slots ?? [];
  if (v.deliverySchedule === 'custom' && v.customDays.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select at least one delivery day',
      path: ['customDays'],
    });
  }
  const seen = new Set<string>();
    for (const slot of slots) {
      if (seen.has(slot)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate slot selected',
          path: ['slots'],
        });
      }
      seen.add(slot);
      if (slots.length > 1) {
        const qty = v.slotQuantities?.[slot];
        if (qty === undefined || qty === null || !(qty >= 0.001)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Quantity required for ${slot} slot`,
            path: ['slotQuantities', slot],
          });
        }
      }
    }
  });

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export const outcomeSchema = z.object({
  deliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid delivery date'),
  // Required for multi-slot subscriptions; omitted for single-slot ones.
  slot: z.enum(['morning', 'evening']).optional(),
  status: z.enum(['delivered', 'partial', 'extra', 'failed', 'skipped']),
  actualQuantity: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().min(0.001, 'Quantity must be at least 0.001').optional(),
  ),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
}).superRefine((v, ctx) => {
  if ((v.status === 'partial' || v.status === 'extra') && v.actualQuantity === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Actual quantity is required',
      path: ['actualQuantity'],
    });
  }
  if ((v.status === 'failed' || v.status === 'skipped') && !v.reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reason is required',
      path: ['reason'],
    });
  }
});

export type SubscriptionOutcomeInput = z.infer<typeof outcomeSchema>;
