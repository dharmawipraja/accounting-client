// Account related types
export type AccountCategory =
  | 'ASSET'
  | 'HUTANG'
  | 'MODAL'
  | 'PENDAPATAN'
  | 'BIAYA'
export type ReportType = 'NERACA' | 'LABA_RUGI'
export type TransactionType = 'DEBIT' | 'KREDIT'
export type AccountType = 'GENERAL' | 'DETAIL'

// General Account interface
export interface AccountGeneral {
  id: string
  accountNumber: string
  accountName: string
  accountType: 'GENERAL'
  accountCategory: AccountCategory
  reportType: ReportType
  transactionType: TransactionType
  amountCredit: number
  amountDebit: number
  createdBy: string
  updatedBy: string
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

// Detail Account interface
export interface AccountDetail {
  id: string
  accountNumber: string
  accountName: string
  accountType: 'DETAIL'
  accountCategory: AccountCategory
  reportType: ReportType
  transactionType: TransactionType
  amountCredit: number
  amountDebit: number
  accountGeneralAccountNumber: string
  createdBy: string
  updatedBy: string
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
  accountGeneral?: {
    id: string
    accountNumber: string
    accountName: string
  }
}

// Query parameters for accounts
export interface AccountQueryParams {
  page?: number
  limit?: number
  search?: string
  accountCategory?: AccountCategory
  reportType?: ReportType
  transactionType?: TransactionType
}

// Account form data (for React Hook Form)
export interface AccountGeneralFormData {
  accountNumber: string
  accountName: string
  accountCategory: AccountCategory
  reportType: ReportType
  transactionType: TransactionType
  amountCredit: number
  amountDebit: number
}

export interface AccountDetailFormData {
  accountNumber: string
  accountName: string
  accountGeneralAccountNumber: string
  accountCategory: AccountCategory
  reportType: ReportType
  transactionType: TransactionType
  amountCredit: number
  amountDebit: number
}
