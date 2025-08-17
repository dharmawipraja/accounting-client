import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Ledger, LedgerQueryParams } from '@/types/ledgers'
import type {
  CreateBulkLedgersPayload,
  UpdateLedgerPayload,
} from '@/types/payloads'
import api from './api'

// Ledgers API Service
export const ledgersService = {
  // Get all ledger entries with pagination and filtering
  async getAll(params?: LedgerQueryParams): Promise<PaginatedResponse<Ledger>> {
    const response = await api.get('/ledgers', { params })
    return response.data
  },

  // Get ledger entry by ID
  async getById(id: string): Promise<ApiResponse<Ledger>> {
    const response = await api.get(`/ledgers/${id}`)
    return response.data
  },

  // Create bulk ledger entries
  async createBulk(
    payload: CreateBulkLedgersPayload,
  ): Promise<ApiResponse<Ledger[]>> {
    const response = await api.post('/ledgers', payload)
    return response.data
  },

  // Update ledger entry
  async update(
    id: string,
    payload: UpdateLedgerPayload,
  ): Promise<ApiResponse<Ledger>> {
    const response = await api.put(`/ledgers/${id}`, payload)
    return response.data
  },

  // Delete ledger entry
  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/ledgers/${id}`)
    return response.data
  },
}
