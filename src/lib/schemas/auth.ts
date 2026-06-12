import { z } from 'zod';

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const roleSchema = z.enum(['VIEWER', 'ACCOUNTANT', 'APPROVER', 'ADMIN']);

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: roleSchema,
});

export type TokenPair = z.infer<typeof tokenPairSchema>;
export type Me = z.infer<typeof meSchema>;
