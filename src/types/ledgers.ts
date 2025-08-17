// Ledger related types
export type LedgerType = 'KAS_MASUK' | 'KAS_KELUAR'
export type PostingStatus = 'PENDING' | 'POSTED'
export type TransactionType = 'DEBIT' | 'CREDIT'

// Ledger interface (API response)
export interface Ledger {
  id: string
  referenceNumber: string
  amount: number
  description: string
  ledgerType: LedgerType
  transactionType: TransactionType
  postingStatus: PostingStatus
  ledgerDate: string
  postingAt?: string | null
  accountDetailId: string
  accountGeneralId: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  accountDetail?: {
    id: string
    accountNumber: string
    accountName: string
  }
  accountGeneral?: {
    id: string
    accountNumber: string
    accountName: string
  }
}

// Query parameters for ledgers
export interface LedgerQueryParams {
  page?: number
  limit?: number
  search?: string // searches description and reference number
  accountDetailId?: string
  accountGeneralId?: string
  ledgerType?: LedgerType
  postingStatus?: PostingStatus
  dateFrom?: string // ISO date string
  dateTo?: string // ISO date string
  amountMin?: number
  amountMax?: number
}

// Form data (for React Hook Form)
export interface LedgerFormData {
  amount: number
  description: string
  accountDetailId: string
  accountGeneralId: string
  ledgerType: LedgerType
  transactionType: TransactionType
  ledgerDate: string
}

// Bulk ledger form data
export interface BulkLedgerFormData {
  ledgers: LedgerFormData[]
}
