import type { User, UserRole } from '@/types'
import { getStoredToken, getStoredUser } from '@/utils/auth'
import { redirect } from '@tanstack/react-router'

export interface AuthContext {
  user: User | null
  isAuthenticated: boolean
}

/**
 * Create authentication context for routes
 */
export function createAuthContext(): AuthContext {
  const token = getStoredToken()
  const user = getStoredUser()
  
  return {
    user,
    isAuthenticated: !!token && !!user
  }
}

/**
 * Require authentication for a route
 */
export function requireAuth() {
  return () => {
    const { isAuthenticated } = createAuthContext()
    
    if (!isAuthenticated) {
      throw redirect({
        to: '/auth/login',
        replace: true
      })
    }
  }
}

/**
 * Require specific roles for a route
 */
export function requireRoles(requiredRoles: UserRole[], allowOwnAccess = false, targetUserId?: string) {
  return () => {
    const { isAuthenticated, user } = createAuthContext()
    
    if (!isAuthenticated) {
      throw redirect({
        to: '/auth/login',
        replace: true
      })
    }
    
    if (requiredRoles.length > 0) {
      const hasRequiredRole = user?.role && requiredRoles.includes(user.role)
      const isOwnAccess = allowOwnAccess && targetUserId && user?.id === targetUserId
      
      if (!hasRequiredRole && !isOwnAccess) {
        throw redirect({
          to: '/dashboard',
          replace: true
        })
      }
    }
  }
}

/**
 * Redirect authenticated users away from auth pages
 */
export function redirectIfAuthenticated() {
  return () => {
    const { isAuthenticated } = createAuthContext()
    
    if (isAuthenticated) {
      throw redirect({
        to: '/dashboard',
        replace: true
      })
    }
  }
}
