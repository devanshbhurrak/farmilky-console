import { z } from 'zod';

export const outcomeSchema = z
  .object({
    status: z.enum(['delivered', 'partial', 'extra', 'failed', 'skipped']),
    actualQuantity: z.coerce.number().min(0).optional(),
    reason: z.string().optional(),
    notes: z.string().optional(),
    paymentMode: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if ((values.status === 'partial' || values.status === 'extra') && values.actualQuantity == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['actualQuantity'],
        message: 'Actual quantity is required for partial / extra outcomes',
      });
    }
    if ((values.status === 'failed' || values.status === 'skipped') && !values.reason) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Reason is required for failed / skipped outcomes',
      });
    }
  });

export type DeliveryOutcomeInput = z.infer<typeof outcomeSchema>;

export const extraProductsSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
        price: z.coerce.number().min(0, 'Price cannot be negative'),
      }),
    )
    .min(1, 'Add at least one product'),
  paymentMode: z.string().default('COD'),
  subscriptionId: z.string().optional(),
});

export type ExtraProductsInput = z.infer<typeof extraProductsSchema>;
