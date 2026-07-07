import { expect, it } from 'vitest';
import { meSchema } from './auth';

it('meSchema defaults mustChangePassword to false when absent', () => {
  const me = meSchema.parse({ id: 'u1', email: 'a@b.c', role: 'ADMIN' });
  expect(me.mustChangePassword).toBe(false);
});

it('meSchema keeps mustChangePassword when present', () => {
  const me = meSchema.parse({ id: 'u1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: true });
  expect(me.mustChangePassword).toBe(true);
});
