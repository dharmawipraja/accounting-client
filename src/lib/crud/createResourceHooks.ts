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
  keys: ResourceKeys;
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
  list: (params?: unknown) => readonly unknown[];
  item: (id: string) => readonly unknown[];
}

export function createResourceKeys(key: string): ResourceKeys {
  return {
    all: [key],
    list: (params?: unknown) => [key, 'list', params],
    item: (id: string) => [key, 'item', id],
  };
}

// Shared CRUD core: the hooks common to every resource shape. Not exported —
// consumed by the two shape-specific factories below.
function createCrudHooks<TItem, TCreate, TUpdate>(config: ResourceConfig<TItem>) {
  const { basePath, itemSchema, paginated = false } = config;
  const keys = config.keys;
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

  type Envelope = { data: TItem[]; total: number; limit: number; offset: number };
  function usePagedList(
    query: Record<string, string | number | undefined> = {},
  ): UseQueryResult<Envelope, ApiError> {
    return useQuery<Envelope, ApiError>({
      queryKey: keys.list(query),
      queryFn: () => apiFetch(basePath, { schema: envelopeSchema, query }),
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

  function useRemove(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${basePath}/${id}`, { method: 'DELETE' }),
      onSuccess: () => invalidate(qc),
    });
  }

  return { keys, basePath, itemSchema, invalidate, useList, usePagedList, useCreate, useUpdate, useRemove };
}

// Master data (accounts, partners, tax codes): an activate/deactivate lifecycle,
// edited in dialogs (no standalone detail view, so no useItem).
export function createMasterDataHooks<TItem, TCreate = unknown, TUpdate = unknown>(
  config: ResourceConfig<TItem>,
) {
  const core = createCrudHooks<TItem, TCreate, TUpdate>(config);

  function useDeactivate(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${core.basePath}/${id}/deactivate`, { method: 'POST' }),
      onSuccess: () => core.invalidate(qc),
    });
  }

  // Reactivation: there is no `/activate` endpoint; the update DTOs accept an
  // optional `isActive`, so a partial PATCH flips the row back on.
  function useActivate(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${core.basePath}/${id}`, { method: 'PATCH', body: { isActive: true } }),
      onSuccess: () => core.invalidate(qc),
    });
  }

  return {
    keys: core.keys,
    useList: core.useList,
    usePagedList: core.usePagedList,
    useCreate: core.useCreate,
    useUpdate: core.useUpdate,
    useRemove: core.useRemove,
    useDeactivate,
    useActivate,
  };
}

// Documents (sales invoices, payments, purchase bills): a draft -> post -> void
// lifecycle (transitions via useDocumentAction) plus a detail view (useItem).
export function createDocumentHooks<TItem, TCreate = unknown, TUpdate = unknown>(
  config: ResourceConfig<TItem>,
) {
  const core = createCrudHooks<TItem, TCreate, TUpdate>(config);

  function useItem(id: string): UseQueryResult<TItem, ApiError> {
    return useQuery<TItem, ApiError>({
      queryKey: core.keys.item(id),
      queryFn: () => apiFetch(`${core.basePath}/${id}`, { schema: core.itemSchema }),
      enabled: !!id,
    });
  }

  return {
    keys: core.keys,
    useList: core.useList,
    usePagedList: core.usePagedList,
    useItem,
    useCreate: core.useCreate,
    useUpdate: core.useUpdate,
    useRemove: core.useRemove,
  };
}

