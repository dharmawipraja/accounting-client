import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';

/** The document lifecycle verbs the CRUD factory's `useAction` builder accepts.
 *  Raw `useDocumentAction` keeps an open `action: string` for non-document
 *  actions (periods' close/reopen). */
export type DocumentActionKind = 'post' | 'void' | 'reverse';

/** A document lifecycle action (post/void/reverse): POST {basePath}/:id/{action} with an
 *  Idempotency-Key, invalidating the resource list on success. */
export function useDocumentAction<TResult = unknown>(config: {
  keys: { all: readonly unknown[] };
  basePath: string;
  action: string;
}): UseMutationResult<TResult, ApiError, { id: string; idempotencyKey: string }> {
  const qc = useQueryClient();
  return useMutation<TResult, ApiError, { id: string; idempotencyKey: string }>({
    mutationFn: ({ id, idempotencyKey }) =>
      apiFetch(`${config.basePath}/${id}/${config.action}`, { method: 'POST', idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: config.keys.all }),
  });
}
