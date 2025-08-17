import { Navigate } from '@tanstack/react-router';
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import { hasAnyRole } from '../../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/auth/login',
}) => {
  const { isAuthenticated, user } = useAuth();

  // Check authentication
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role permissions if specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasAnyRole(user.role, allowedRoles)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
