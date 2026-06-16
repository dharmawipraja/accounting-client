import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { z, type ZodType } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';

export interface ResourceConfig<TItem> {
  key: string;
  basePath: string;
  itemSchema: ZodType<TItem>;
  /**
   * Set to true for resources whose list endpoint returns a pagination envelope
   * { data: TItem[], total: number, limit: number, offset: number }.
   * useList will unwrap the envelope and still resolve to TItem[], so consumers
   * are unchanged. Requests limit=200 to preserve the old "show all" behaviour.
   * Default: false (bare array).
   */
  paginated?: boolean;
}

export interface ResourceKeys {
  all: readonly unknown[];
  list: () => readonly unknown[];
  item: (id: string) => readonly unknown[];
}

export function createResourceKeys(key: string): ResourceKeys {
  return {
    all: [key],
    list: () => [key, 'list'],
    item: (id: string) => [key, 'item', id],
  };
}

export function createResourceHooks<TItem, TCreate = unknown, TUpdate = unknown>(
  config: ResourceConfig<TItem>,
) {
  const { basePath, itemSchema, paginated = false } = config;
  const keys = createResourceKeys(config.key);
  const listSchema = itemSchema.array();
  const envelopeSchema = z.object({
    data: listSchema,
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });

  const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: keys.all });

  function useList(): UseQueryResult<TItem[], ApiError> {
    return useQuery<TItem[], ApiError>({
      queryKey: keys.list(),
      queryFn: paginated
        ? async () => {
            const envelope = await apiFetch(basePath, {
              schema: envelopeSchema,
              query: { limit: 200 },
            });
            return envelope.data;
          }
        : () => apiFetch(basePath, { schema: listSchema }),
    });
  }

  function useItem(id: string): UseQueryResult<TItem, ApiError> {
    return useQuery<TItem, ApiError>({
      queryKey: keys.item(id),
      queryFn: () => apiFetch(`${basePath}/${id}`, { schema: itemSchema }),
      enabled: !!id,
    });
  }

  function useCreate(): UseMutationResult<TItem, ApiError, TCreate> {
    const qc = useQueryClient();
    return useMutation<TItem, ApiError, TCreate>({
      mutationFn: (data) =>
        apiFetch(basePath, { method: 'POST', body: data, schema: itemSchema }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useUpdate(): UseMutationResult<TItem, ApiError, { id: string; data: TUpdate }> {
    const qc = useQueryClient();
    return useMutation<TItem, ApiError, { id: string; data: TUpdate }>({
      mutationFn: ({ id, data }) =>
        apiFetch(`${basePath}/${id}`, { method: 'PATCH', body: data, schema: itemSchema }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useDeactivate(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${basePath}/${id}/deactivate`, { method: 'POST' }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useRemove(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${basePath}/${id}`, { method: 'DELETE' }),
      onSuccess: () => invalidate(qc),
    });
  }

  return { keys, useList, useItem, useCreate, useUpdate, useDeactivate, useRemove };
}
