// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const

// App Configuration
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'Accounting System',
  VERSION: '1.0.0',
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
} as const

// Authentication
export const AUTH_CONFIG = {
  TOKEN_KEY: 'accounting_token',
  USER_KEY: 'accounting_user',
  TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes in milliseconds
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
} as const

// User Roles and Permissions
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAJER: 'MANAJER',
  AKUNTAN: 'AKUNTAN',
  KASIR: 'KASIR',
  KOLEKTOR: 'KOLEKTOR',
  NASABAH: 'NASABAH',
} as const

export const ROLE_HIERARCHY = {
  [USER_ROLES.ADMIN]: 6,
  [USER_ROLES.MANAJER]: 5,
  [USER_ROLES.AKUNTAN]: 4,
  [USER_ROLES.KASIR]: 3,
  [USER_ROLES.KOLEKTOR]: 2,
  [USER_ROLES.NASABAH]: 1,
} as const

export const ROLE_PERMISSIONS = {
  USERS_MANAGEMENT: [USER_ROLES.ADMIN, USER_ROLES.MANAJER],
  ACCOUNTS_MANAGEMENT: [
    USER_ROLES.ADMIN,
    USER_ROLES.MANAJER,
    USER_ROLES.AKUNTAN,
  ],
  LEDGERS_MANAGEMENT: [
    USER_ROLES.ADMIN,
    USER_ROLES.MANAJER,
    USER_ROLES.AKUNTAN,
  ],
  PROFILE_MANAGEMENT: Object.values(USER_ROLES),
} as const

// Account Categories
export const ACCOUNT_CATEGORIES = {
  ASSET: 'ASSET',
  HUTANG: 'HUTANG',
  MODAL: 'MODAL',
  PENDAPATAN: 'PENDAPATAN',
  BIAYA: 'BIAYA',
} as const

export const REPORT_TYPES = {
  NERACA: 'NERACA',
  LABA_RUGI: 'LABA_RUGI',
} as const

export const TRANSACTION_TYPES = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
} as const

// Ledger Types
export const LEDGER_TYPES = {
  KAS_MASUK: 'KAS_MASUK',
  KAS_KELUAR: 'KAS_KELUAR',
} as const

export const LEDGER_TYPE_LABELS = {
  [LEDGER_TYPES.KAS_MASUK]: 'Kas Masuk',
  [LEDGER_TYPES.KAS_KELUAR]: 'Kas Keluar',
} as const

export const POSTING_STATUS = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
} as const

// Status Types
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

// Pagination
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  PROFILE: '/auth/profile',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  ACCOUNTS_GENERAL: '/accounts/general',
  ACCOUNTS_DETAIL: '/accounts/detail',
  LEDGERS: '/ledgers',
  LEDGERS_KAS_MASUK: '/ledgers/kas-masuk',
  LEDGERS_KAS_KELUAR: '/ledgers/kas-keluar',
} as const

// Form Validation
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  ACCOUNT_NUMBER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[0-9-]+$/,
  },
  ACCOUNT_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 500,
  },
} as const

// Account Category Labels
export const ACCOUNT_CATEGORY_LABELS = {
  [ACCOUNT_CATEGORIES.ASSET]: 'Asset',
  [ACCOUNT_CATEGORIES.HUTANG]: 'Hutang',
  [ACCOUNT_CATEGORIES.MODAL]: 'Modal',
  [ACCOUNT_CATEGORIES.PENDAPATAN]: 'Pendapatan',
  [ACCOUNT_CATEGORIES.BIAYA]: 'Biaya',
} as const

export const REPORT_TYPE_LABELS = {
  [REPORT_TYPES.NERACA]: 'Neraca',
  [REPORT_TYPES.LABA_RUGI]: 'Laba Rugi',
} as const

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.DEBIT]: 'Debit',
  [TRANSACTION_TYPES.CREDIT]: 'Credit',
} as const

export const ACCOUNT_TYPES = {
  GENERAL: 'GENERAL',
  DETAIL: 'DETAIL',
} as const

export const ACCOUNT_TYPE_LABELS = {
  [ACCOUNT_TYPES.GENERAL]: 'General',
  [ACCOUNT_TYPES.DETAIL]: 'Detail',
} as const

// UI Constants
export const UI_CONFIG = {
  NOTIFICATION_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  TOAST_MAX_ITEMS: 5,
} as const

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const
