import { z } from 'zod';

const emailOrEmpty = z.union([z.email(), z.literal('')]).optional();

export const agentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: emailOrEmpty,
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Enter a 10-digit phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  agentInfo: z
    .object({
      joiningDate: z.string().optional(),
      vehicleType: z.string().optional(),
      maxCapacity: z.coerce.number().min(0).optional(),
      assignedArea: z.string().optional(),
    })
    .optional(),
});

export const createAgentSchema = agentSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateAgentSchema = agentSchema;

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
