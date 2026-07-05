import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { queryKeys } from '@/lib/query/keys';

type YearArgs = { fiscalYear: number; idempotencyKey?: string };

export function useGeneratePeriods() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, YearArgs>({
    mutationFn: ({ fiscalYear, idempotencyKey }) =>
      apiFetch('/ledger/periods/generate', { method: 'POST', body: { fiscalYear }, idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.periods.all }),
  });
}

export function useClosePeriod() {
  return useDocumentAction({ keys: queryKeys.periods, basePath: '/ledger/periods', action: 'close' });
}

export function useReopenPeriod() {
  return useDocumentAction({ keys: queryKeys.periods, basePath: '/ledger/periods', action: 'reopen' });
}

export function useRunYearEnd() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, YearArgs>({
    mutationFn: ({ fiscalYear, idempotencyKey }) =>
      apiFetch('/close/year-end', { method: 'POST', body: { fiscalYear }, idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.yearEnd.all });
      qc.invalidateQueries({ queryKey: queryKeys.periods.all });
    },
  });
}

export function useReopenYear() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, YearArgs>({
    mutationFn: ({ fiscalYear, idempotencyKey }) =>
      apiFetch(`/close/year-end/${fiscalYear}/reopen`, { method: 'POST', idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.yearEnd.all });
      qc.invalidateQueries({ queryKey: queryKeys.periods.all });
    },
  });
}
