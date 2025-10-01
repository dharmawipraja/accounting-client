import { useQuery } from '@tanstack/react-query'

import { journalLedgersService } from '@/services/journalLedgers'
import type { JournalLedgerQueryParams } from '@/types/journalLedgers'

// Query Keys
export const journalLedgerQueryKeys = {
  all: ['journal-ledgers'] as const,
  lists: () => [...journalLedgerQueryKeys.all, 'list'] as const,
  list: (params?: JournalLedgerQueryParams) =>
    [...journalLedgerQueryKeys.lists(), params] as const,
  details: () => [...journalLedgerQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...journalLedgerQueryKeys.details(), id] as const,
}

// Get all journal ledgers query
export const useJournalLedgersQuery = (params?: JournalLedgerQueryParams) => {
  return useQuery({
    queryKey: journalLedgerQueryKeys.list(params),
    queryFn: () => journalLedgersService.getAll(params),
  })
}

// Get journal ledger by ID query
export const useJournalLedgerQuery = (id: string) => {
  return useQuery({
    queryKey: journalLedgerQueryKeys.detail(id),
    queryFn: () => journalLedgersService.getById(id),
    enabled: !!id,
  })
}
