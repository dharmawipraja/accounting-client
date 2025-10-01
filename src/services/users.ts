import type { ApiResponse, PaginatedResponse, User } from '@/types/api'
import type {
  ChangePasswordPayload,
  CreateUserPayload,
  UpdateUserPayload,
} from '@/types/payloads'
import type { UserQueryParams } from '@/types/query'
import { api } from './api'

/**
 * User management service
 * Handles all user-related API operations
 */
export const userService = {
  /**
   * Get paginated list of users with optional filtering
   */
  async getUsers(params?: UserQueryParams): Promise<PaginatedResponse<User[]>> {
    const response = await api.get<PaginatedResponse<User[]>>('/users', {
      params,
    })
    return response.data
  },

  /**
   * Get a single user by ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`)
    return response.data
  },

  /**
   * Create a new user
   */
  async createUser(payload: CreateUserPayload): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/users', payload)
    return response.data
  },

  /**
   * Update an existing user
   */
  async updateUser(
    id: string,
    payload: UpdateUserPayload,
  ): Promise<ApiResponse<User>> {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, payload)
    return response.data
  },

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<ApiResponse<User>> {
    const response = await api.delete<ApiResponse<User>>(`/users/${id}`)
    return response.data
  },

  /**
   * Change user password
   */
  async changePassword(
    payload: ChangePasswordPayload,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>(
      '/users/change-password',
      payload,
    )
    return response.data
  },
}
