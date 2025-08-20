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

  // Get single general account by accountNumber
  async getById(accountNumber: string): Promise<ApiResponse<AccountGeneral>> {
    const response = await api.get(`/accounts/general/${accountNumber}`)
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
    accountNumber: string,
    data: UpdateAccountGeneralPayload,
  ): Promise<ApiResponse<AccountGeneral>> {
    const response = await api.put(`/accounts/general/${accountNumber}`, data)
    return response.data
  },

  // Delete general account (soft delete)
  async delete(accountNumber: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/accounts/general/${accountNumber}`)
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

  // Get single detail account by accountNumber
  async getById(accountNumber: string): Promise<ApiResponse<AccountDetail>> {
    const response = await api.get(`/accounts/detail/${accountNumber}`)
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
    accountNumber: string,
    data: UpdateAccountDetailPayload,
  ): Promise<ApiResponse<AccountDetail>> {
    const response = await api.put(`/accounts/detail/${accountNumber}`, data)
    return response.data
  },

  // Delete detail account (soft delete)
  async delete(accountNumber: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/accounts/detail/${accountNumber}`)
    return response.data
  },
}
