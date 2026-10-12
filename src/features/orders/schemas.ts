import { z } from 'zod';

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  variantId: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
});

export const createOrderSchema = z.object({
  userId: z.string().min(1, 'Select a customer'),
  items: z.array(orderItemSchema).min(1, 'Add at least one item'),
  paymentMethod: z.enum(['COD', 'online', 'upi', 'cash']).default('COD'),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
