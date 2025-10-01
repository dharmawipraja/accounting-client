import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  JournalLedger,
  JournalLedgerQueryParams,
} from '@/types/journalLedgers'
import api from './api'

// Journal Ledgers API Service
export const journalLedgersService = {
  // Get all journal ledger entries with pagination and filtering
  async getAll(
    params?: JournalLedgerQueryParams,
  ): Promise<PaginatedResponse<JournalLedger>> {
    const response = await api.get('/journal-ledgers', { params })
    return response.data
  },

  // Get journal ledger entry by ID
  async getById(id: string): Promise<ApiResponse<JournalLedger>> {
    const response = await api.get(`/journal-ledgers/${id}`)
    return response.data
  },
}
