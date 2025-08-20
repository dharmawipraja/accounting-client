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
  generalDetail: (accountNumber: string) =>
    [...accountQueryKeys.general(), 'detail', accountNumber] as const,
  detail: () => [...accountQueryKeys.all, 'detail'] as const,
  detailList: (params: AccountQueryParams) =>
    [...accountQueryKeys.detail(), 'list', params] as const,
  detailDetail: (accountNumber: string) =>
    [...accountQueryKeys.detail(), 'detail', accountNumber] as const,
}

// ============================================================================
// Individual General Account Query Hook
export const useAccountGeneralByIdQuery = (accountNumber: string) => {
  return useQuery({
    queryKey: ['accountGeneral', accountNumber],
    queryFn: () => accountsGeneralService.getById(accountNumber),
    enabled: !!accountNumber,
  })
}

// Individual Detail Account Query Hook
export const useAccountDetailByIdQuery = (accountNumber: string) => {
  return useQuery({
    queryKey: ['accountDetail', accountNumber],
    queryFn: () => accountsDetailService.getById(accountNumber),
    enabled: !!accountNumber,
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

// Hook to fetch a single general account by accountNumber
export function useAccountGeneralQuery(accountNumber: string) {
  return useQuery({
    queryKey: accountQueryKeys.generalDetail(accountNumber),
    queryFn: () => accountsGeneralService.getById(accountNumber),
    enabled: !!accountNumber,
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
      accountNumber,
      data,
    }: {
      accountNumber: string
      data: UpdateAccountGeneralPayload
    }) => accountsGeneralService.update(accountNumber, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch general accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.general() })
      // Update the specific account in cache
      queryClient.setQueryData(
        accountQueryKeys.generalDetail(variables.accountNumber),
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
    mutationFn: (accountNumber: string) =>
      accountsGeneralService.delete(accountNumber),
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

// Hook to fetch a single detail account by accountNumber
export function useAccountDetailQuery(accountNumber: string) {
  return useQuery({
    queryKey: accountQueryKeys.detailDetail(accountNumber),
    queryFn: () => accountsDetailService.getById(accountNumber),
    enabled: !!accountNumber,
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
      accountNumber,
      data,
    }: {
      accountNumber: string
      data: UpdateAccountDetailPayload
    }) => accountsDetailService.update(accountNumber, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch detail accounts list
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.detail() })
      // Update the specific account in cache
      queryClient.setQueryData(
        accountQueryKeys.detailDetail(variables.accountNumber),
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
    mutationFn: (accountNumber: string) =>
      accountsDetailService.delete(accountNumber),
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
