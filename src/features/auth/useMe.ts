import { apiFetch } from '@/lib/api/client';
import { meSchema, type Me } from '@/lib/schemas/auth';

export function fetchMe(): Promise<Me> {
  return apiFetch('/auth/me', { schema: meSchema });
}
