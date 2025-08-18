import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  accountsDetailService,
  accountsGeneralService,
} from '@/services/accounts'
import type { AccountQueryParams } from '@/types/accounts'
import type {
  CreateAccountDetailPayload,
  CreateAccountGeneralPayload,
  UpdateAccountDetailPayload,
  UpdateAccountGeneralPayload,
} from '@/types/payloads'

// Query Keys
export const accountQueryKeys = {
  all: ['accounts'] as const,
  general: () => [...accountQueryKeys.all, 'general'] as const,
  generalList: (params: AccountQueryParams) =>
    [...accountQueryKeys.general(), 'list', params] as const,
  generalDetail: (id: string) =>
    [...accountQueryKeys.general(), 'detail', id] as const,
  detail: () => [...accountQueryKeys.all, 'detail'] as const,
  detailList: (params: AccountQueryParams) =>
    [...accountQueryKeys.detail(), 'list', params] as const,
  detailDetail: (id: string) =>
    [...accountQueryKeys.detail(), 'detail', id] as const,
}

// ============================================================================
// Individual General Account Query Hook
export const useAccountGeneralByIdQuery = (id: string) => {
  return useQuery({
    queryKey: ['accountGeneral', id],
    queryFn: () => accountsGeneralService.getById(id),
    enabled: !!id,
  })
}

// Individual Detail Account Query Hook
export const useAccountDetailByIdQuery = (id: string) => {
  return useQuery({
    queryKey: ['accountDetail', id],
    queryFn: () => accountsDetailService.getById(id),
    enabled: !!id,
  })
}

// General Accounts List Query Hook
// ============================================================================

// Hook to fetch general accounts with pagination and filtering
export function useAccountsGeneralQuery(params: AccountQueryParams = {}) {
  return useQuery({
    queryKey: accountQueryKeys.generalList(params),
    queryFn: () => accountsGeneralService.getAll(params),
  })
}

// Hook to fetch a single general account by ID
export function useAccountGeneralQuery(id: string) {
  return useQuery({
    queryKey: accountQueryKeys.generalDetail(id),
    queryFn: () => accountsGeneralService.getById(id),
    enabled: !!id,
  })
}

// Hook to create a new general account
export function useCreateAccountGeneralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAccountGeneralPayload) =>
      accountsGeneralService.create(data),
    onSuccess: () => {
      // Invalidate and refetch general accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.general() })
      toast.success('General account created successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to create general account'
      toast.error(message)
    },
  })
}

// Hook to update a general account
export function useUpdateAccountGeneralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateAccountGeneralPayload
    }) => accountsGeneralService.update(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch general accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.general() })
      // Update the specific account in cache
      queryClient.setQueryData(
        accountQueryKeys.generalDetail(variables.id),
        data,
      )
      toast.success('General account updated successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to update general account'
      toast.error(message)
    },
  })
}

// Hook to delete a general account
export function useDeleteAccountGeneralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => accountsGeneralService.delete(id),
    onSuccess: () => {
      // Invalidate and refetch general accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.general() })
      toast.success('General account deleted successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to delete general account'
      toast.error(message)
    },
  })
}

// ============================================================================
// DETAIL ACCOUNTS HOOKS
// ============================================================================

// Hook to fetch detail accounts with pagination and filtering
export function useAccountsDetailQuery(params: AccountQueryParams = {}) {
  return useQuery({
    queryKey: accountQueryKeys.detailList(params),
    queryFn: () => accountsDetailService.getAll(params),
  })
}

// Hook to fetch a single detail account by ID
export function useAccountDetailQuery(id: string) {
  return useQuery({
    queryKey: accountQueryKeys.detailDetail(id),
    queryFn: () => accountsDetailService.getById(id),
    enabled: !!id,
  })
}

// Hook to create a new detail account
export function useCreateAccountDetailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAccountDetailPayload) =>
      accountsDetailService.create(data),
    onSuccess: () => {
      // Invalidate and refetch detail accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.detail() })
      toast.success('Detail account created successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to create detail account'
      toast.error(message)
    },
  })
}

// Hook to update a detail account
export function useUpdateAccountDetailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateAccountDetailPayload
    }) => accountsDetailService.update(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch detail accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.detail() })
      // Update the specific account in cache
      queryClient.setQueryData(
        accountQueryKeys.detailDetail(variables.id),
        data,
      )
      toast.success('Detail account updated successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to update detail account'
      toast.error(message)
    },
  })
}

// Hook to delete a detail account
export function useDeleteAccountDetailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => accountsDetailService.delete(id),
    onSuccess: () => {
      // Invalidate and refetch detail accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.detail() })
      toast.success('Detail account deleted successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to delete detail account'
      toast.error(message)
    },
  })
}
