import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ledgersService } from '@/services/ledgers'
import type { LedgerQueryParams } from '@/types/ledgers'
import type {
  CreateBulkLedgersPayload,
  UpdateLedgerPayload,
} from '@/types/payloads'

// Query Keys
export const ledgerQueryKeys = {
  all: ['ledgers'] as const,
  lists: () => [...ledgerQueryKeys.all, 'list'] as const,
  list: (params?: LedgerQueryParams) =>
    [...ledgerQueryKeys.lists(), params] as const,
  details: () => [...ledgerQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...ledgerQueryKeys.details(), id] as const,
}

// Get all ledgers query
export const useLedgersQuery = (params?: LedgerQueryParams) => {
  return useQuery({
    queryKey: ledgerQueryKeys.list(params),
    queryFn: () => ledgersService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get ledger by ID query
export const useLedgerQuery = (id: string) => {
  return useQuery({
    queryKey: ledgerQueryKeys.detail(id),
    queryFn: () => ledgersService.getById(id),
    enabled: !!id,
  })
}

// Create bulk ledgers mutation
export const useCreateBulkLedgersMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBulkLedgersPayload) =>
      ledgersService.createBulk(payload),
    onSuccess: () => {
      // Invalidate and refetch ledgers list
      queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.lists() })
      toast.success('Ledger entries created successfully')
    },
    onError: (error: any) => {
      console.error('Error creating ledger entries:', error)
      toast.error(
        error?.response?.data?.message || 'Failed to create ledger entries',
      )
    },
  })
}

// Update ledger mutation
export const useUpdateLedgerMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLedgerPayload }) =>
      ledgersService.update(id, data),
    onSuccess: (response, { id }) => {
      // Update the specific ledger in cache
      queryClient.setQueryData(ledgerQueryKeys.detail(id), response)
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.lists() })
      toast.success('Ledger entry updated successfully')
    },
    onError: (error: any) => {
      console.error('Error updating ledger entry:', error)
      toast.error(
        error?.response?.data?.message || 'Failed to update ledger entry',
      )
    },
  })
}

// Delete ledger mutation
export const useDeleteLedgerMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ledgersService.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ledgerQueryKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.lists() })
      toast.success('Ledger entry deleted successfully')
    },
    onError: (error: any) => {
      console.error('Error deleting ledger entry:', error)
      toast.error(
        error?.response?.data?.message || 'Failed to delete ledger entry',
      )
    },
  })
}
