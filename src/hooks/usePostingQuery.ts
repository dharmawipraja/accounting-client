import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useTranslation } from '@/hooks/useTranslation'
import { postingService } from '@/services/posting'
import type {
  PostBukuBesarPayload,
  PostNeracaAkhirPayload,
  PostNeracaBalancePayload,
  PostNeracaDetailPayload,
  UnpostBukuBesarPayload,
  UnpostNeracaDetailPayload,
} from '@/types/posting'

// Query Keys
export const postingQueryKeys = {
  all: ['posting'] as const,
  neracaBalance: (date?: string) =>
    [...postingQueryKeys.all, 'neraca-balance', date] as const,
}

// Calculate Neraca Balance query
export const useNeracaBalanceQuery = (date: string) => {
  return useQuery({
    queryKey: postingQueryKeys.neracaBalance(date),
    queryFn: () => postingService.calculateNeracaBalance(date),
    enabled: !!date,
  })
}

// Post Buku Besar mutation
export const usePostBukuBesarMutation = () => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (payload: PostBukuBesarPayload) =>
      postingService.postBukuBesar(payload),
    onSuccess: () => {
      // Invalidate ledger queries since posting affects ledger status
      queryClient.invalidateQueries({ queryKey: ['ledgers'] })
      toast.success(t('toasts.bukuBesarPostedSuccessfully'))
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t('toasts.failedToPostBukuBesar'),
      )
    },
  })
}

// Post Neraca Detail mutation
export const usePostNeracaDetailMutation = () => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (payload: PostNeracaDetailPayload) =>
      postingService.postNeracaDetail(payload),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: postingQueryKeys.all })
      toast.success(t('toasts.neracaDetailPostedSuccessfully'))
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t('toasts.failedToPostNeracaDetail'),
      )
    },
  })
}

// Post Neraca Balance mutation
export const usePostNeracaBalanceMutation = () => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (payload: PostNeracaBalancePayload) =>
      postingService.postNeracaBalance(payload),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: postingQueryKeys.all })
      toast.success(t('toasts.neracaBalancePostedSuccessfully'))
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t('toasts.failedToPostNeracaBalance'),
      )
    },
  })
}

// Post Neraca Akhir mutation
export const usePostNeracaAkhirMutation = () => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (payload: PostNeracaAkhirPayload) =>
      postingService.postNeracaAkhir(payload),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: postingQueryKeys.all })
      toast.success(t('toasts.neracaAkhirPostedSuccessfully'))
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t('toasts.failedToPostNeracaAkhir'),
      )
    },
  })
}

// Unpost Buku Besar mutation
export const useUnpostBukuBesarMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UnpostBukuBesarPayload) =>
      postingService.unpostBukuBesar(payload),
    onSuccess: () => {
      // Invalidate ledger queries since unposting affects ledger status
      queryClient.invalidateQueries({ queryKey: ['ledgers'] })
      toast.success('Buku Besar unposted successfully')
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to unpost Buku Besar',
      )
    },
  })
}

// Unpost Neraca Detail mutation
export const useUnpostNeracaDetailMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UnpostNeracaDetailPayload) =>
      postingService.unpostNeracaDetail(payload),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: postingQueryKeys.all })
      toast.success('Neraca Detail unposted successfully')
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to unpost Neraca Detail',
      )
    },
  })
}
