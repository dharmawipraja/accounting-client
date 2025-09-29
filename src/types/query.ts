// ===============================
// QUERY PARAMETERS TYPES
// ===============================

// Common pagination params
export interface PaginationParams {
  page?: number // default: 1, min: 1
  limit?: number // default: 10, min: 1, max: 100
}

// User query params
export interface UserQueryParams extends PaginationParams {
  search?: string // searches username and name
  role?: 'ADMIN' | 'MANAJER' | 'AKUNTAN' | 'KASIR' | 'KOLEKTOR' | 'NASABAH'
  status?: 'ACTIVE' | 'INACTIVE'
  createdFrom?: string // ISO date string
  createdTo?: string // ISO date string
  includeInactive?: boolean // default: false
}

// Account query params
export interface AccountQueryParams extends PaginationParams {
  search?: string // searches account number and name
  accountCategory?: 'ASSET' | 'HUTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA'
  reportType?: 'NERACA' | 'LABA_RUGI'
  includeDeleted?: boolean // default: false
}

// Account detail specific query params
export interface AccountDetailQueryParams extends AccountQueryParams {
  accountGeneralAccountNumber?: string // filter by parent general account
  includeLedgers?: boolean // default: false
}

// Ledger query params
export interface LedgerQueryParams extends PaginationParams {
  search?: string // searches description and reference number
  accountDetailAccountNumber?: string
  accountGeneralAccountNumber?: string
  ledgerType?: 'KAS' | 'KAS_MASUK' | 'KAS_KELUAR'
  postingStatus?: 'PENDING' | 'POSTED'
  dateFrom?: string // ISO date string
  dateTo?: string // ISO date string
  amountMin?: number
  amountMax?: number
}
