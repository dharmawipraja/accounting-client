import { AppLayout } from '@/components/AppLayout'
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
      <AppLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
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
        <AppLayout>
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Access Denied
              </h1>
              <p className="text-muted-foreground">
                You don't have permission to access this page.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Required roles: {requiredRoles.join(', ')}
              </p>
            </div>
          </div>
        </AppLayout>
      )
    }
  }

  return <AppLayout>{children}</AppLayout>
}
