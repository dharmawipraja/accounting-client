import type {
  ApiResponse,
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  User,
} from '@/types'
import { api } from './api'

export const authService = {
  /**
   * User login
   */
  async login(credentials: LoginPayload): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials,
    )
    return response.data
  },

  /**
   * User logout
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response =
      await api.post<ApiResponse<{ message: string }>>('/auth/logout')
    return response.data
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/profile')
    return response.data
  },

  /**
   * Change password
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
