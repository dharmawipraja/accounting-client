import type { ApiResponse } from '@/types/api'
import type {
    NeracaBalanceCalculation,
    PostBukuBesarPayload,
    PostingResponse,
    PostNeracaAkhirPayload,
    PostNeracaBalancePayload,
    PostNeracaDetailPayload,
    UnpostBukuBesarPayload,
    UnpostNeracaDetailPayload,
} from '@/types/posting'
import { api } from './api'

/**
 * Posting service for accounting operations
 * Handles posting and unposting of various accounting documents
 */
export const postingService = {
    /**
     * Post Buku Besar (General Ledger)
     * Posts ledger entries for a specific date
     */
    async postBukuBesar(
        payload: PostBukuBesarPayload,
    ): Promise<ApiResponse<PostingResponse>> {
        const response = await api.post<ApiResponse<PostingResponse>>(
            '/posting/buku-besar',
            payload,
        )
        return response.data
    },

    /**
     * Post Neraca Detail (Detailed Balance Sheet)
     * Posts detailed balance sheet for a specific date
     */
    async postNeracaDetail(
        payload: PostNeracaDetailPayload,
    ): Promise<ApiResponse<PostingResponse>> {
        const response = await api.post<ApiResponse<PostingResponse>>(
            '/posting/neraca-detail',
            payload,
        )
        return response.data
    },

    /**
     * Calculate Neraca Balance
     * Calculates balance sheet totals for validation before posting
     */
    async calculateNeracaBalance(
        date: string,
    ): Promise<ApiResponse<NeracaBalanceCalculation>> {
        const response = await api.get<ApiResponse<NeracaBalanceCalculation>>(
            '/posting/neraca-balance/calculate',
            {
                params: { date },
            },
        )
        return response.data
    },

    /**
     * Post Neraca Balance (SHU - Sisa Hasil Usaha)
     * Posts final balance sheet with retained earnings
     */
    async postNeracaBalance(
        payload: PostNeracaBalancePayload,
    ): Promise<ApiResponse<PostingResponse>> {
        const response = await api.post<ApiResponse<PostingResponse>>(
            '/posting/neraca-balance',
            payload,
        )
        return response.data
    },

    /**
     * Post Neraca Akhir (Final Balance Sheet)
     * Posts the final balance sheet for period-end closing
     */
    async postNeracaAkhir(
        payload: PostNeracaAkhirPayload,
    ): Promise<ApiResponse<PostingResponse>> {
        const response = await api.post<ApiResponse<PostingResponse>>(
            '/posting/neraca-akhir',
            payload,
        )
        return response.data
    },

    /**
     * Unpost Buku Besar (Reverse General Ledger Posting)
     * Reverses ledger posting for a specific date
     */
    async unpostBukuBesar(
        payload: UnpostBukuBesarPayload,
    ): Promise<ApiResponse<PostingResponse>> {
        const response = await api.post<ApiResponse<PostingResponse>>(
            '/posting/unposting/buku-besar',
            payload,
        )
        return response.data
    },

    /**
     * Unpost Neraca Detail (Reverse Detailed Balance Sheet)
     * Reverses detailed balance sheet posting for a specific date
     */
    async unpostNeracaDetail(
        payload: UnpostNeracaDetailPayload,
    ): Promise<ApiResponse<PostingResponse>> {
        const response = await api.post<ApiResponse<PostingResponse>>(
            '/posting/unposting/neraca-detail',
            payload,
        )
        return response.data
    },
}
