import type {
  AccountDetail,
  AccountGeneral,
  AccountQueryParams,
} from '@/types/accounts'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  CreateAccountDetailPayload,
  CreateAccountGeneralPayload,
  UpdateAccountDetailPayload,
  UpdateAccountGeneralPayload,
} from '@/types/payloads'
import api from './api'

// General Accounts API Service
export const accountsGeneralService = {
  // Get all general accounts with pagination and filtering
  async getAll(
    params?: AccountQueryParams,
  ): Promise<PaginatedResponse<AccountGeneral>> {
    const response = await api.get('/accounts/general', { params })
    return response.data
  },

  // Get single general account by ID
  async getById(id: string): Promise<ApiResponse<AccountGeneral>> {
    const response = await api.get(`/accounts/general/${id}`)
    return response.data
  },

  // Create new general account
  async create(
    data: CreateAccountGeneralPayload,
  ): Promise<ApiResponse<AccountGeneral>> {
    const response = await api.post('/accounts/general', data)
    return response.data
  },

  // Update general account
  async update(
    id: string,
    data: UpdateAccountGeneralPayload,
  ): Promise<ApiResponse<AccountGeneral>> {
    const response = await api.put(`/accounts/general/${id}`, data)
    return response.data
  },

  // Delete general account (soft delete)
  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/accounts/general/${id}`)
    return response.data
  },
}

// Detail Accounts API Service
export const accountsDetailService = {
  // Get all detail accounts with pagination and filtering
  async getAll(
    params?: AccountQueryParams,
  ): Promise<PaginatedResponse<AccountDetail>> {
    const response = await api.get('/accounts/detail', { params })
    return response.data
  },

  // Get single detail account by ID
  async getById(id: string): Promise<ApiResponse<AccountDetail>> {
    const response = await api.get(`/accounts/detail/${id}`)
    return response.data
  },

  // Create new detail account
  async create(
    data: CreateAccountDetailPayload,
  ): Promise<ApiResponse<AccountDetail>> {
    const response = await api.post('/accounts/detail', data)
    return response.data
  },

  // Update detail account
  async update(
    id: string,
    data: UpdateAccountDetailPayload,
  ): Promise<ApiResponse<AccountDetail>> {
    const response = await api.put(`/accounts/detail/${id}`, data)
    return response.data
  },

  // Delete detail account (soft delete)
  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/accounts/detail/${id}`)
    return response.data
  },
}
