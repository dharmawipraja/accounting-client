import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { queryKeys } from '@/lib/query/keys';
import {
  journalEntriesPageSchema,
  journalEntrySchema,
  type JournalEntriesPage,
  type JournalEntry,
  type JournalEntryCreatePayload,
} from './schema';

export interface JournalEntriesParams {
  status?: string;
  sourceType?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export function useJournalEntries(params: JournalEntriesParams): UseQueryResult<JournalEntriesPage, ApiError> {
  return useQuery<JournalEntriesPage, ApiError>({
    queryKey: queryKeys.journalEntries.list(params),
    queryFn: () =>
      apiFetch('/ledger/journal-entries', {
        query: { status: params.status, sourceType: params.sourceType, from: params.from, to: params.to, limit: params.limit, offset: params.offset },
        schema: journalEntriesPageSchema,
      }),
  });
}

export function useJournalEntry(id: string): UseQueryResult<JournalEntry, ApiError> {
  return useQuery<JournalEntry, ApiError>({
    queryKey: queryKeys.journalEntries.item(id),
    queryFn: () => apiFetch(`/ledger/journal-entries/${id}`, { schema: journalEntrySchema }),
    enabled: !!id,
  });
}

export function useCreateJournalEntry(): UseMutationResult<JournalEntry, ApiError, JournalEntryCreatePayload> {
  const qc = useQueryClient();
  return useMutation<JournalEntry, ApiError, JournalEntryCreatePayload>({
    mutationFn: (data) => apiFetch('/ledger/journal-entries', { method: 'POST', body: data, schema: journalEntrySchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries.all }),
  });
}

export function useDeleteJournalEntry(): UseMutationResult<unknown, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (id) => apiFetch(`/ledger/journal-entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries.all }),
  });
}

export const usePostJournalEntry = () => useDocumentAction({ key: 'journalEntries', basePath: '/ledger/journal-entries', action: 'post' });
export const useReverseJournalEntry = () => useDocumentAction({ key: 'journalEntries', basePath: '/ledger/journal-entries', action: 'reverse' });
