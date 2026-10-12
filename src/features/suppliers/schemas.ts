import { z } from 'zod';

const emailOrEmpty = z.union([z.email(), z.literal('')]).optional();

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Enter a 10-digit phone number'),
  email: emailOrEmpty,
  location: z.string().optional(),
  pincode: z.string().optional(),
  joiningDate: z.string().optional(),
  collectionSessions: z.array(z.enum(['morning', 'evening'])).default(['morning', 'evening']),
  defaultMorningQty: z.coerce.number().min(0).optional(),
  defaultEveningQty: z.coerce.number().min(0).optional(),
  defaultRatePerLiter: z.coerce.number().min(0, 'Rate cannot be negative').optional(),
  isActive: z.boolean().default(true),
  bankDetails: z
    .object({
      holderName: z.string().optional(),
      accountNo: z.string().optional(),
      ifscCode: z.string().optional(),
      bankName: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type CreateSupplierInput = z.infer<typeof supplierSchema>;
