import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDocumentHooks } from '@/lib/crud/createResourceHooks';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import {
  journalEntrySchema,
  journalEntryListItemSchema,
  type JournalEntry,
  type JournalEntryListItem,
  type JournalEntryCreatePayload,
} from './schema';

export interface JournalEntriesParams {
  status?: string;
  sourceType?: string;
  q?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

// journals' register row (JournalEntryListItem — omits `lines`, adds totalDebit/lineCount)
// differs from the detail (JournalEntry), so the factory gets a distinct listItemSchema.
export const journalEntriesApi = createDocumentHooks<JournalEntry, JournalEntryCreatePayload, unknown, JournalEntryListItem>({
  keys: queryKeys.journalEntries,
  basePath: '/ledger/journal-entries',
  itemSchema: journalEntrySchema,
  listItemSchema: journalEntryListItemSchema,
  paginated: true,
});

export const useJournalEntries = (p: JournalEntriesParams) =>
  journalEntriesApi.usePagedList({ status: p.status, sourceType: p.sourceType, q: p.q, from: p.from, to: p.to, limit: p.limit, offset: p.offset });
export const useJournalEntry = (id: string) => journalEntriesApi.useItem(id);
export const useCreateJournalEntry = journalEntriesApi.useCreate;

/** One-step create-and-post (?post=true). APPROVER/ADMIN only — the API rejects
 *  an ACCOUNTANT with 403, so callers role-gate the trigger. */
export function useCreateAndPostJournalEntry() {
  const qc = useQueryClient();
  return useMutation<JournalEntry, ApiError, JournalEntryCreatePayload>({
    mutationFn: (data) =>
      apiFetch('/ledger/journal-entries', { method: 'POST', body: data, query: { post: 'true' }, schema: journalEntrySchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries.all }),
  });
}
export const useDeleteJournalEntry = journalEntriesApi.useRemove;
export const usePostJournalEntry = () => journalEntriesApi.useAction('post');
export const useReverseJournalEntry = () => journalEntriesApi.useAction('reverse');
