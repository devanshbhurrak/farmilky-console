import { z } from 'zod';

export const areaSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  pincodes: z.array(z.string().trim().min(1, 'Pincode cannot be empty')).default([]),
  localities: z.array(z.string().trim().min(1, 'Locality cannot be empty')).default([]),
  assignedAgent: z.string().trim().optional(),
  sequence: z.coerce.number().min(0, 'Sequence cannot be negative').default(0),
});

export type AreaInput = z.infer<typeof areaSchema>;
