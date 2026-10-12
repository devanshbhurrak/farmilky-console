import { z } from 'zod';

export const rolePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export type RolePermissionsInput = z.infer<typeof rolePermissionsSchema>;
