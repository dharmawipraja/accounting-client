import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ZodType } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';

export function useReport<T>(path: string, params: Record<string, string | undefined>, schema: ZodType<T>, enabled = true): UseQueryResult<T, ApiError> {
  return useQuery<T, ApiError>({
    queryKey: ['report', path, params],
    queryFn: () => apiFetch(path, { query: params, schema }),
    enabled,
  });
}
