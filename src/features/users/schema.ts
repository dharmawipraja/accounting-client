import { z } from 'zod';
import { roleSchema } from '@/lib/schemas/auth';

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const createUserResponseSchema = z.object({ user: userSchema, tempPassword: z.string() });
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: roleSchema,
});
export type UserCreateValues = z.infer<typeof userCreateSchema>;

export const userEditSchema = z.object({
  name: z.string().min(1),
  role: roleSchema,
  isActive: z.boolean(),
});
export type UserEditValues = z.infer<typeof userEditSchema>;
