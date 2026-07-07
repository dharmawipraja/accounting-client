import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import {
  userSchema,
  createUserResponseSchema,
  type User,
  type CreateUserResponse,
  type UserCreateValues,
  type UserEditValues,
} from './schema';

const envelopeSchema = z.object({
  data: userSchema.array(),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type UsersEnvelope = z.infer<typeof envelopeSchema>;

export function useUsers(
  query: { limit: number; offset: number },
  opts: { enabled?: boolean } = {},
): UseQueryResult<UsersEnvelope, ApiError> {
  return useQuery<UsersEnvelope, ApiError>({
    queryKey: queryKeys.users.list(query),
    queryFn: () => apiFetch('/users', { schema: envelopeSchema, query }),
    enabled: opts.enabled ?? true,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<CreateUserResponse, ApiError, UserCreateValues>({
    mutationFn: (data) => apiFetch('/users', { method: 'POST', body: data, schema: createUserResponseSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<User, ApiError, { id: string; data: Partial<UserEditValues> }>({
    mutationFn: ({ id, data }) => apiFetch(`/users/${id}`, { method: 'PATCH', body: data, schema: userSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation<CreateUserResponse, ApiError, string>({
    mutationFn: (id) => apiFetch(`/users/${id}/reset-password`, { method: 'POST', schema: createUserResponseSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}
