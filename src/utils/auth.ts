import {
  AUTH_CONFIG,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  USER_ROLES,
} from '@/constants'
import type { UserRole } from '@/types'
import { filter, includes, map, some } from 'lodash'
import { toast } from 'sonner'
import { safeJsonParse } from './index'

/**
 * Get token from localStorage
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Store token in localStorage
 */
export function storeToken(token: string): void {
  try {
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token)
  } catch {
    toast.error('Failed to save authentication data')
  }
}

/**
 * Remove token from localStorage
 */
export function removeToken(): void {
  try {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY)
  } catch {
    toast.error('Failed to clear authentication data')
  }
}

/**
 * Get user from localStorage
 */
export function getStoredUser() {
  try {
    const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY)
    return userStr ? safeJsonParse(userStr, null) : null
  } catch {
    return null
  }
}

/**
 * Store user in localStorage
 */
export function storeUser(user: any): void {
  try {
    localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user))
  } catch {
    toast.error('Failed to save user data')
  }
}

/**
 * Remove user from localStorage
 */
export function removeUser(): void {
  try {
    localStorage.removeItem(AUTH_CONFIG.USER_KEY)
  } catch {
    toast.error('Failed to clear user data')
  }
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  removeToken()
  removeUser()
}

/**
 * Check if token is expired (basic check)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    return payload.exp < currentTime
  } catch {
    return true
  }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
  return userLevel >= requiredLevel
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(
  userRole: UserRole,
  requiredRoles: UserRole[],
): boolean {
  return some(requiredRoles, (role) => hasRole(userRole, role))
}

/**
 * Check if user can manage users
 */
export function canManageUsers(userRole: UserRole): boolean {
  return includes(
    ROLE_PERMISSIONS.USERS_MANAGEMENT as readonly UserRole[],
    userRole,
  )
}

/**
 * Check if user can manage accounts
 */
export function canManageAccounts(userRole: UserRole): boolean {
  return includes(
    ROLE_PERMISSIONS.ACCOUNTS_MANAGEMENT as readonly UserRole[],
    userRole,
  )
}

/**
 * Check if user can manage ledgers
 */
export function canManageLedgers(userRole: UserRole): boolean {
  return includes(
    ROLE_PERMISSIONS.LEDGERS_MANAGEMENT as readonly UserRole[],
    userRole,
  )
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [USER_ROLES.ADMIN]: 'Administrator',
    [USER_ROLES.MANAJER]: 'Manager',
    [USER_ROLES.AKUNTAN]: 'Accountant',
    [USER_ROLES.KASIR]: 'Cashier',
    [USER_ROLES.KOLEKTOR]: 'Collector',
    [USER_ROLES.NASABAH]: 'Customer',
  }

  return roleNames[role] || role
}

/**
 * Get available roles for user creation (based on current user role)
 */
export function getAvailableRoles(currentUserRole: UserRole): UserRole[] {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0

  return map(
    filter(
      Object.entries(ROLE_HIERARCHY),
      ([, level]) => level <= currentLevel,
    ),
    ([role]) => role as UserRole,
  )
}
