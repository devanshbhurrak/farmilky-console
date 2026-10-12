import { z } from 'zod';

const emailOrEmpty = z.union([z.email(), z.literal('')]).optional();

const pincodeOrEmpty = z.union([z.string().regex(/^[0-9]{6}$/, 'Enter a 6-digit pincode'), z.literal('')]).optional();

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: emailOrEmpty,
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Enter a 10-digit phone number'),
  role: z.enum(['customer', 'agent', 'admin']).default('customer'),
  isActive: z.boolean().default(true),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      pincode: pincodeOrEmpty,
    })
    .optional(),
  deliveryConfig: z
    .object({
      assignedArea: z.string().optional(),
      deliverySequence: z.coerce.number().min(0).optional(),
    })
    .optional(),
});

export const createCustomerSchema = customerSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateCustomerSchema = customerSchema;

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
