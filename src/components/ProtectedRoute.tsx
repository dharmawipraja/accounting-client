import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'
import { Navigate } from '@tanstack/react-router'
import React from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  allowOwnAccess?: boolean
  targetUserId?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  allowOwnAccess = false,
  targetUserId,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  // Check role requirements if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = user?.role && requiredRoles.includes(user.role)
    const isOwnAccess =
      allowOwnAccess && targetUserId && user?.id === targetUserId

    if (!hasRequiredRole && !isOwnAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Required roles: {requiredRoles.join(', ')}
            </p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
