// Auth types
export interface AuthState {
  user: {
    id: string;
    username: string;
    name: string;
    role: "ADMIN" | "MANAJER" | "AKUNTAN" | "KASIR" | "KOLEKTOR" | "NASABAH";
    status?: "ACTIVE" | "INACTIVE";
    createdAt?: string;
    updatedAt?: string;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// UI State types
export interface UIState {
  isLoading: boolean;
  notifications: Notification[];
  theme: 'light' | 'dark';
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

// Form types
export interface FormFieldError {
  field: string;
  message: string;
}

export interface ValidationErrors {
  [key: string]: string | string[];
}

// Route protection types
export type UserRole = "ADMIN" | "MANAJER" | "AKUNTAN" | "KASIR" | "KOLEKTOR" | "NASABAH";

export interface RouteProtection {
  requireAuth: boolean;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

// Generic types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingState {
  status: Status;
  error?: string;
}

// Export all API types
export * from './api';
export * from './payloads';
export * from './query';

