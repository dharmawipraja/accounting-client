import { userService } from '@/services/users'
import type {
  ChangePasswordPayload,
  CreateUserPayload,
  UpdateUserPayload,
} from '@/types/payloads'
import type { UserQueryParams } from '@/types/query'
import { useCallback } from 'react'
import { toast } from 'sonner'

export const useUsers = () => {
  const getUsers = useCallback(async (params?: UserQueryParams) => {
    try {
      const response = await userService.getUsers(params)
      return response
    } catch (error) {
      toast.error('Failed to fetch users')
      throw error
    }
  }, [])

  const getUserById = useCallback(async (id: string) => {
    try {
      const response = await userService.getUserById(id)
      return response
    } catch (error) {
      toast.error('Failed to fetch user')
      throw error
    }
  }, [])

  const createUser = useCallback(async (payload: CreateUserPayload) => {
    try {
      const response = await userService.createUser(payload)
      toast.success('User created successfully')
      return response
    } catch (error) {
      toast.error('Failed to create user')
      throw error
    }
  }, [])

  const updateUser = useCallback(
    async (id: string, payload: UpdateUserPayload) => {
      try {
        const response = await userService.updateUser(id, payload)
        toast.success('User updated successfully')
        return response
      } catch (error) {
        toast.error('Failed to update user')
        throw error
      }
    },
    [],
  )

  const deleteUser = useCallback(async (id: string) => {
    try {
      const response = await userService.deleteUser(id)
      toast.success('User deleted successfully')
      return response
    } catch (error) {
      toast.error('Failed to delete user')
      throw error
    }
  }, [])

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    try {
      const response = await userService.changePassword(payload)
      toast.success('Password changed successfully')
      return response
    } catch (error) {
      toast.error('Failed to change password')
      throw error
    }
  }, [])

  return {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
  }
}
