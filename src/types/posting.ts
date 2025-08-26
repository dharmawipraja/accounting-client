// Posting related types for accounting operations

// Posting payload types
export interface PostBukuBesarPayload {
    ledgerDate: string // ISO date format: "2025-08-25"
}

export interface PostNeracaDetailPayload {
    date: string // DD-MM-YYYY format: "25-08-2025"
}

export interface PostNeracaBalancePayload {
    date: string // DD-MM-YYYY format: "25-08-2025"
    sisaHasilUsahaAmount: number
}

export interface PostNeracaAkhirPayload {
    date: string // DD-MM-YYYY format: "25-08-2025"
}

export interface UnpostBukuBesarPayload {
    ledgerDate: string // ISO date format: "2025-08-25"
}

export interface UnpostNeracaDetailPayload {
    date: string // DD-MM-YYYY format: "25-08-2025"
}

// Response types
export interface PostingResponse {
    message: string
    success: boolean
    processedAt: string
}

export interface NeracaBalanceCalculation {
    totalAsset: number
    totalLiability: number
    totalEquity: number
    sisaHasilUsaha: number
    isBalanced: boolean
    calculatedAt: string
}

// Posting status enum
export type PostingOperationType =
    | 'BUKU_BESAR'
    | 'NERACA_DETAIL'
    | 'NERACA_BALANCE'
    | 'NERACA_AKHIR'

export type PostingAction = 'POST' | 'UNPOST'

// Form data interfaces for React Hook Form
export interface BukuBesarFormData {
    ledgerDate: string
}

export interface NeracaDetailFormData {
    date: string
}

export interface NeracaBalanceFormData {
    date: string
    sisaHasilUsahaAmount: number
}

export interface NeracaAkhirFormData {
    date: string
}
