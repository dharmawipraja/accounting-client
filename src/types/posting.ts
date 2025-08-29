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
  data: {
    calculationDetails: {
      accountsProcessed: number
      calculationDate: string
      sisaHasilUsaha: string // API returns string, not number
      totalBiaya: string // API returns string, not number
      totalPendapatan: string // API returns string, not number
      year: string
    }
    existingRecord?: {
      id: string
      currentAmount: string
      accountingClose: boolean
      createdAt: string
      updatedAt: string
    }
    canSave: boolean
  }
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
