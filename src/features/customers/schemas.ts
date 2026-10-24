import { z } from 'zod';

const emailOrEmpty = z.union([z.email(), z.literal('')]).optional();

const pincodeOrEmpty = z.union([z.string().regex(/^[0-9]{6}$/, 'Enter a 6-digit pincode'), z.literal('')]).optional();

export const USER_ROLES = [
  'customer',
  'admin',
  'delivery',
  'delivery_partner',
  'agent',
  'supplier',
] as const;

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: emailOrEmpty,
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  role: z.enum(USER_ROLES).default('customer'),
  isActive: z.boolean().default(true),
  password: z.union([passwordSchema, z.literal('')]).optional(),
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
  password: passwordSchema,
});

export const updateCustomerSchema = customerSchema;

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
