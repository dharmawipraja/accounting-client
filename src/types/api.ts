// ===============================
// RESPONSE TYPES (What API Returns)
// ===============================

// Base response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  message?: string
}

// User types
export interface User {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'MANAJER' | 'AKUNTAN' | 'KASIR' | 'KOLEKTOR' | 'NASABAH'
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

// Authentication response
export interface AuthResponse {
  token: string
  user: {
    id: string
    username: string
    name: string
    role: 'ADMIN' | 'MANAJER' | 'AKUNTAN' | 'KASIR' | 'KOLEKTOR' | 'NASABAH'
  }
  expiresIn: string // default: "24h"
}

// Account types
export interface AccountGeneral {
  id: string
  accountNumber: string
  accountName: string
  accountType: 'GENERAL'
  accountCategory: 'ASSET' | 'HUTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA'
  reportType: 'NERACA' | 'LABA_RUGI'
  transactionType: 'DEBIT' | 'CREDIT'
  amountCredit: number
  amountDebit: number
  createdBy: string
  updatedBy: string
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AccountDetail {
  id: string
  accountNumber: string
  accountName: string
  accountType: 'DETAIL'
  accountCategory: 'ASSET' | 'HUTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA'
  reportType: 'NERACA' | 'LABA_RUGI'
  transactionType: 'DEBIT' | 'CREDIT'
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

// Ledger types
export interface Ledger {
  id: string
  referenceNumber: string
  amount: number
  description: string
  ledgerType: 'KAS_MASUK' | 'KAS_KELUAR'
  transactionType: 'DEBIT' | 'CREDIT'
  postingStatus: 'PENDING' | 'POSTED'
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
  }
  accountGeneral?: {
    id: string
    accountNumber: string
    accountName: string
  }
}
