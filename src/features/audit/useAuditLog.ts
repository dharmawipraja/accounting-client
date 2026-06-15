import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { auditListSchema, type AuditEntry } from './schema';

export interface AuditFilters {
  method?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export function useAuditLog(filters: AuditFilters, enabled = true) {
  return useQuery<AuditEntry[], ApiError>({
    queryKey: queryKeys.audit.list(filters),
    queryFn: () =>
      apiFetch('/audit', {
        query: {
          method: filters.method || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          limit: filters.limit,
          offset: filters.offset,
        },
        schema: auditListSchema,
      }),
    enabled,
  });
}
