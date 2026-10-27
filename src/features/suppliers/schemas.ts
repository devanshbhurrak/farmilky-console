import { z } from 'zod';

const emailOrEmpty = z.union([z.email(), z.literal('')]).optional();

// Indian pincode: 6 digits, first digit cannot be 0
const pincodeSchema = z.union([
  z.literal(''),
  z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode'),
]).optional();

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: emailOrEmpty,
  location: z.string().optional(),
  pincode: pincodeSchema,
  joiningDate: z.string().optional(),
  collectionSessions: z.array(z.enum(['morning', 'evening'])).min(1, 'Select at least one collection session').default(['morning']),
  defaultMorningQty: z.coerce.number().min(0, 'Quantity cannot be negative').optional(),
  defaultEveningQty: z.coerce.number().min(0, 'Quantity cannot be negative').optional(),
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
