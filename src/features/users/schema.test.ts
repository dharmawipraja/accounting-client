import { expect, it } from 'vitest';
import { userSchema, createUserResponseSchema, userCreateSchema } from './schema';

it('parses a user row', () => {
  const u = userSchema.parse({
    id: 'u1', email: 'a@b.c', name: 'Ana', role: 'ACCOUNTANT',
    isActive: true, mustChangePassword: false, createdAt: '2026-07-07T00:00:00.000Z',
  });
  expect(u.name).toBe('Ana');
});

it('parses the create/reset response with a temp password', () => {
  const r = createUserResponseSchema.parse({
    user: { id: 'u1', email: 'a@b.c', name: 'Ana', role: 'VIEWER', isActive: true, mustChangePassword: true, createdAt: '2026-07-07T00:00:00.000Z' },
    tempPassword: 'Temp-1234',
  });
  expect(r.tempPassword).toBe('Temp-1234');
});

it('rejects an invalid create email', () => {
  expect(userCreateSchema.safeParse({ email: 'nope', name: 'x', role: 'VIEWER' }).success).toBe(false);
});
