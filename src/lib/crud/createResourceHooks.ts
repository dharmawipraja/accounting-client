import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ZodType } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';

export interface ResourceConfig<TItem> {
  key: string;
  basePath: string;
  itemSchema: ZodType<TItem>;
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
  const { basePath, itemSchema } = config;
  const keys = createResourceKeys(config.key);
  const listSchema = itemSchema.array();

  const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: keys.all });

  function useList(): UseQueryResult<TItem[], ApiError> {
    return useQuery<TItem[], ApiError>({
      queryKey: keys.list(),
      queryFn: () => apiFetch(basePath, { schema: listSchema }),
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
