// ===============================
// REQUEST PAYLOAD TYPES (What Frontend Sends)
// ===============================

// Authentication payloads
export interface LoginPayload {
  username: string // min: 3 chars, alphanumeric + underscore/hyphen
  password: string // min: 6 chars
}

// User management payloads
export interface CreateUserPayload {
  username: string // min: 3 chars, max: 50, alphanumeric + underscore/hyphen
  password: string // min: 6 chars
  name: string // min: 2 chars, max: 100
  role?: 'ADMIN' | 'MANAJER' | 'AKUNTAN' | 'KASIR' | 'KOLEKTOR' | 'NASABAH' // default: 'NASABAH'
  status?: 'ACTIVE' | 'INACTIVE' // default: 'ACTIVE'
}

export interface UpdateUserPayload {
  username?: string // min: 3 chars, max: 50, alphanumeric + underscore/hyphen
  password?: string // min: 6 chars
  name?: string // min: 2 chars, max: 100
  role?: 'ADMIN' | 'MANAJER' | 'AKUNTAN' | 'KASIR' | 'KOLEKTOR' | 'NASABAH'
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string // min: 6 chars
  confirmPassword: string // must match newPassword
}

// Account management payloads
export interface CreateAccountGeneralPayload {
  accountNumber: string // min: 1, max: 20, numbers and hyphens only
  accountName: string // min: 3 chars, max: 100
  accountCategory: 'ASSET' | 'HUTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA'
  reportType: 'NERACA' | 'LABA_RUGI'
  transactionType: 'DEBIT' | 'KREDIT'
  amountCredit?: number // default: 0, positive decimal
  amountDebit?: number // default: 0, positive decimal
}

export interface UpdateAccountGeneralPayload {
  accountName: string // min: 3 chars, max: 100
  accountCategory: 'ASSET' | 'HUTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA'
  reportType: 'NERACA' | 'LABA_RUGI'
  transactionType: 'DEBIT' | 'KREDIT'
  amountCredit: number // positive decimal
  amountDebit: number // positive decimal
}

export interface CreateAccountDetailPayload {
  accountNumber: string // min: 1, max: 20, numbers and hyphens only
  accountName: string // min: 3 chars, max: 100
  accountGeneralAccountNumber: string // UUID
  accountCategory: 'ASSET' | 'HUTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA'
  reportType: 'NERACA' | 'LABA_RUGI'
  transactionType: 'DEBIT' | 'KREDIT'
  amountCredit?: number // default: 0, positive decimal
  amountDebit?: number // default: 0, positive decimal
}

export interface UpdateAccountDetailPayload {
  accountName: string // min: 3 chars, max: 100
  accountCategory: 'ASSET' | 'HUTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA'
  reportType: 'NERACA' | 'LABA_RUGI'
  transactionType: 'DEBIT' | 'KREDIT'
  amountCredit: number // positive decimal
  amountDebit: number // positive decimal
}

// Ledger management payloads
export interface LedgerItem {
  amount: number // positive decimal
  description: string // min: 3 chars, max: 500
  accountDetailAccountNumber: string // UUID
  accountGeneralAccountNumber: string // UUID
  ledgerType: 'KAS' | 'KAS_MASUK' | 'KAS_KELUAR'
  transactionType: 'DEBIT' | 'KREDIT'
  ledgerDate: string // ISO date string
}

export interface CreateBulkLedgersPayload {
  ledgers: LedgerItem[] // min: 1 item, max: 100 items
}

export interface UpdateLedgerPayload {
  amount?: number // positive decimal
  description?: string // min: 3 chars, max: 500
  accountDetailAccountNumber?: string // UUID
  accountGeneralAccountNumber?: string // UUID
  ledgerType?: 'KAS' | 'KAS_MASUK' | 'KAS_KELUAR'
  transactionType?: 'DEBIT' | 'KREDIT'
  ledgerDate?: string // ISO date string
  postingStatus?: 'PENDING' | 'POSTED'
}
