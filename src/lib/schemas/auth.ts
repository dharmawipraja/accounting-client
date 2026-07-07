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
  // Absent on older payloads -> false. The live /auth/me always returns it.
  mustChangePassword: z.boolean().default(false),
});

export const okFlagSchema = z.object({ ok: z.boolean() });

export type TokenPair = z.infer<typeof tokenPairSchema>;
export type Me = z.infer<typeof meSchema>;
