import type { LedgerType, PostingStatus, TransactionType } from './ledgers'

// Journal Ledger interface (API response)
export interface JournalLedger {
  id: string
  referenceNumber: string
  amount: number
  amountDebit: number
  amountCredit: number
  description: string
  ledgerType: LedgerType
  transactionType: TransactionType
  postingStatus: PostingStatus
  ledgerDate: string
  postingAt?: string | null
  accountDetailAccountNumber: string
  accountGeneralAccountNumber: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  accountDetail?: {
    id: string
    accountNumber: string
    accountName: string
    transactionType: TransactionType
  }
  accountGeneral?: {
    id: string
    accountNumber: string
    accountName: string
  }
}

// Query parameters for journal ledgers
export interface JournalLedgerQueryParams {
  page?: number
  limit?: number
  search?: string // searches description and reference number
  accountDetailAccountNumber?: string
  accountGeneralAccountNumber?: string
  ledgerType?: LedgerType
  postingStatus?: PostingStatus
  dateFrom?: string // ISO date string
  dateTo?: string // ISO date string
  amountMin?: number
  amountMax?: number
  includeAccounts?: boolean
}
