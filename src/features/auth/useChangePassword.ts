import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { okFlagSchema } from '@/lib/schemas/auth';

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation<{ ok: boolean }, ApiError, ChangePasswordInput>({
    mutationFn: (body) =>
      apiFetch('/auth/change-password', { method: 'POST', body, schema: okFlagSchema }),
  });
}
