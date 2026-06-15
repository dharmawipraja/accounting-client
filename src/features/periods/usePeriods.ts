import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { periodListSchema, yearEndStatusSchema, type Period, type YearEndStatus } from './schema';

export function usePeriods(fiscalYear: number) {
  return useQuery<Period[], ApiError>({
    queryKey: queryKeys.periods.list(fiscalYear),
    queryFn: () => apiFetch('/ledger/periods', { query: { fiscalYear }, schema: periodListSchema }),
  });
}

export function useYearEndStatus(fiscalYear: number) {
  return useQuery<YearEndStatus | null, ApiError>({
    queryKey: queryKeys.yearEnd.status(fiscalYear),
    queryFn: async () => {
      try {
        return await apiFetch(`/close/year-end/${fiscalYear}`, { schema: yearEndStatusSchema });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}
